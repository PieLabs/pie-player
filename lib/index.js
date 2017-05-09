import Elements from './elements';
import debounce from 'lodash/debounce';
import find from 'lodash/find';
import forEach from 'lodash/forEach';
import isArray from 'lodash/isArray';

export default class PiePlayer extends HTMLElement {

  constructor() {
    super();
    this._pies = {};
    this._statuses = {};

    this.addEventListener('pie.register', (event) => {
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
    let event = new CustomEvent('pie.player-ready', { bubbles: true });
    this.dispatchEvent(event);
  }

  set controller(c) {
    this._controller = c;
    this._update();
  }

  set env(e) {
    this._env = e;
    this._update();
    if (this.elements) {
      this.elements.env = e;
    }
  }

  set session(s) {
    if (!isArray(s)) {
      throw new Error('session must be an array');
    }

    this._session = s;
    this._update();
  }

  set elementModels(elementModels) {
    if (elementModels) {
      this.elements = new Elements(this, elementModels);
      if (this._env) {
        this.elements.env = this._env;
      }
    }
  }

  status() {
    return new Promise((resolve) => {

      const result = this._session.map(s => {
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

  resetResponse() {
    return new Promise((resolve, reject) => {
      this._session.forEach(r => {
        const pie = this._pies[r.id];
        delete r['response'];
        delete r['value'];
        delete r['answer'];
      });
      resolve(this._session);
    });
  }

  reset() {
    return new Promise((resolve, reject) => {
      this._session.forEach(r => {
        Object.keys(r).forEach(k => {
          if (k !== 'id') {
            delete r[k];
          }
        });

        const pie = this._pies[r.id];
      });
      resolve(this._session);
    });
  }

  getOutcome() {
    return this._controller.outcome(this._session, this._env);
  }

  _initSession(ids) {
    if (!this._session) {
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
      let event = new CustomEvent('pie.model-updated');
      this.dispatchEvent(event);
    };

    let dispatchModelError = e => {
      let event = new CustomEvent('pie.model-update.error', {
        bubbles: true, detail: {
          error: e
        }
      });
      this.dispatchEvent(event);
    }

    if (this._controller && this._env && this._session) {
      this._controller.model(this._session, this._env)
        .then((models) => {
          this._latestModels = models;
          this._updateElements();
        })
        .then(dispatchModelUpdated)
        .catch(dispatchModelError);
    }
  }

  _getOrCreateSession(id) {

    //We need to wait for the session to be injected
    if (!this._session) {
      return undefined;
    }

    let existing = find(this._session, { id: id });
    if (existing) {
      return existing;
    } else {
      let out = { id: id };
      this._session.push(out);
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
