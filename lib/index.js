import Elements from './elements';
import cloneDeep from 'lodash/cloneDeep';
import debounce from 'lodash/debounce';
import find from 'lodash/find';
import forEach from 'lodash/forEach';
import isArray from 'lodash/isArray';

function applyUpdateToSessions(pies, sessions, update) {
  sessions.forEach(s => {
    const existingKeys = Object.keys(s);
    const updated = find(update, u => u.id === s.id) || { id: s.id };
    const updateKeys = Object.keys(updated);
    existingKeys.forEach(ek => {
      if (updateKeys.indexOf(ek) === -1) {
        delete s[ek];
      }
    });
    const pie = pies[s.id];
    pie.session = s;
  });
  return sessions;
}

export default class PiePlayer extends HTMLElement {

  constructor() {
    super();
    this._pies = {};
    this._statuses = {};

    this.addEventListener('register-pie', (event) => {
      //stop the event from bubbling further
      event.preventDefault();
      event.stopImmediatePropagation();

      let id = event.target.getAttribute('pie-id');

      if (!id) {
        throw new Error(`Element is missing a [pie-id] attribute: ${event.target.nodeName}`);
      }

      if (this._pies[id]) {
        throw new Error(`a pie with that id (${id}) is already registered: ${this._pies[id]}`);
      }

      this._pies[id] = event.target;

      const updateStatus = (e) => {
        this._statuses[id] = this._statuses[id] || { complete: undefined }
        const status = this._statuses[id];
        status.complete = e.detail.complete;
      }

      /** dispatched when a session is set or changed in the element. */
      this._pies[id].addEventListener('response-changed', updateStatus);

      /** dispatched when a model is set on the element. */
      this._pies[id].addEventListener('model-set', updateStatus);

      this._updateElement(event.target, id);
    });
  }

  connectedCallback() {
    let event = new CustomEvent('ready', { bubbles: true });
    this.dispatchEvent(event);
  }

  /**
   * set the controller.
   */
  set controller(c) {
    this._controller = c;
    this._update();
  }

  /**
   * Set the env
   * @param {Object} e - the env 
   * @return {Promise<Object>} - return the env
   */
  env(e) {
    this._env = e;
    return this._update()
      .then(result => {
        if (this.elements) {
          this.elements.env = e;
        }
        return this._env;
      });
  }

  /**
   * Set the sessions. 
   * @param {Object[]} s - the sessions array
   * @return {Promise<Object[]>} - the sessions array that was passed in
   */
  sessions(s) {

    if (!isArray(s)) {
      return Promise.reject(new Error('session must be an array'));
    }

    this._sessions = s;
    return this._update().then(() => this._sessions);
  }

  /**
   * 
   * @param {Object[]} elementModels 
   */
  elementModels(elementModels) {
    return new Promise((resolve, reject) => {
      if (elementModels) {
        this.elements = new Elements(this, elementModels);
        if (this._env) {
          this.elements.env = this._env;
        }
        resolve(elementModels);
      } else {
        reject(new Error('element models is not defined'));
      }
    });
  }

  status() {
    return new Promise((resolve) => {

      const result = this._sessions.map(s => {
        const status = this._statuses[s.id];
        const out = { id: s.id };

        if (status) {
          out.complete = status.complete;
        }

        return out;
      });
      resolve(result);
    });
  }

  /**
   * Reset the 'response' only. 
   * > Also resets legacy: 'value' and 'answer' fields for now.
   * @param {Function} predicate 
   */
  resetResponse(predicate) {
    const proposed = cloneDeep(this._sessions);
    proposed.forEach(r => {
      delete r['response'];
      delete r['value'];
      delete r['answer'];
    });

    return predicate(proposed)
      .then((update) => {
        return applyUpdateToSessions(this._pies, this._sessions, update);
      });
  }

  /**
   * Remove everything except the 'id' field.
   * @param {Function} predicate 
   */
  reset(predicate) {
    const proposed = cloneDeep(this._sessions);
    proposed.forEach(r => {
      Object.keys(r).forEach(k => {
        if (k !== 'id') {
          delete r[k];
        }
      });
    });

    return predicate(proposed)
      .then((update) => {
        return applyUpdateToSessions(this._pies, this._sessions, update);
      });
  }

  outcomes() {
    return this._controller.outcome(this._sessions, this._env);
  }

  _initSessions(ids) {
    if (!this._sessions) {
      throw new Error('no session initialised - this must be injected');
    }

    forEach(ids, (id) => {
      let hasId = find(this._session, { id: id });
      if (!hasId) {
        this._session.push({ id: id });
      }
    });
  };

  _update() {

    let dispatchModelUpdated = () => {
      let event = new CustomEvent('model-updated');
      this.dispatchEvent(event);
    };

    let dispatchModelError = e => {
      let event = new CustomEvent('model-update-error', {
        bubbles: true, detail: {
          error: e
        }
      });
      this.dispatchEvent(event);
    }

    if (this._controller && this._env && this._sessions) {
      return this._controller.model(this._sessions, this._env)
        .then((models) => {
          this._latestModels = models;
          this._updateElements();
        })
        .then(dispatchModelUpdated)
        .then(() => { skipped: false });
    } else {
      return Promise.resolve({ skipped: true });
    }
  }

  _getOrCreateSession(id) {

    //We need to wait for the session to be injected
    if (!this._sessions) {
      return undefined;
    }

    let existing = find(this._sessions, { id: id });
    if (existing) {
      return existing;
    } else {
      let out = { id: id };
      this._sessions.push(out);
      return out;
    }
  }

  _updateElement(pie, id, missingModelOrSession) {
    missingModelOrSession = missingModelOrSession || (() => { });
    let model = find(this._latestModels, { id: id });
    let session = this._getOrCreateSession(id);
    if (!model || !session) {
      missingModelOrSession(pie, id);
      return;
    }
    pie.model = model;
    pie.session = session;
  }

  _updateElements() {
    forEach(
      this._pies,
      (pie, id) => {
        this._updateElement(pie, id, (pie, id) => console.error('missing model or session for pie: ' + pie));
      }
    );
  }
}
