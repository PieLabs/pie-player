import find from 'lodash/find';
import isArray from 'lodash/isArray';
import uniq from 'lodash/uniq';
/**
 * Dispatched when the PiePlayer has been mounted on the dom. 
 *
 * @event PiePlayer#ready 
 * @type {object}
 */

/**
 * Dispatched when a pie instance within the player's dom has had it's model set or has updated the session. 
 * @event PiePlayer#sessions-changed
 * @type {Object}
 */

/**
 * @deprecated Not needed anymore, use the Promise api instead.
 * Dispatched when the call to controller.model has been successful.
 * @event PiePlayer#model-updated
 * @type {Object}
 */

/**
 * A custom element that contains pie instances and interacts with a pie controller. 
 * @extends HTMLElement
 * 
 * @fires PiePlayer#sessions-changed
 * @fires PiePlayer#model-updated
 */
class PiePlayer extends HTMLElement {

  constructor() {
    super();
    this._pies = {};
    this._statuses = {};
    this._registerPiesIfNeeded = this._registerPiesIfNeeded.bind(this);
    this._updateElements = this._updateElements.bind(this);
  }

  /**
   * @fires PiePlayer#ready
   */
  connectedCallback() {
    let event = new CustomEvent('ready', { bubbles: true });
    this.dispatchEvent(event);
  }

  /**
   * Set the controller.
   * @param {Object} controller - the controller has 2 methods: `model` and `outcome`.
   */
  set controller(c) {
    this._controller = c;
    this._update();
  }

  /**
   * Set the env.
   * @param {Object} env - the env object
   * @returns {Promise}
   * @fulfil {Object} - The env that was passed in.
   * @reject {Error} - An error which comes from calling controller.model. 
   */
  env(e) {
    this._env = e;
    return this._update()
      .then(result => this._env);
  }


  /**
   * Set the sessions. 
   * @param {Object[]} sessions - the sessions array 
   * @returns {Promise}
   * @fulfil {Object} - The env that was passed in.
   * @reject {Error} - An error which comes from calling controller.model. 
   */
  sessions(s) {

    if (!isArray(s)) {
      return Promise.reject(new Error('session must be an array'));
    }

    this._sessions = s;
    return this._update().then(() => this._sessions);
  }

  /**
   * @typedef {Object} Status 
   * @property {string} id The id 
   * @property {boolean} complete Is the session complete 
   */

  /**
   * Get the status of the sessions
   * @returns {Promise}
   * @fulfil {Status[]} - The array of statuses.  
   */
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
   * Get the outcomes.
   * @returns {Promise}
   * @fulfil {Object[]} - An array of outcomes
   */
  outcomes() {
    return this._controller.outcome(this._sessions, this._env);
  }

  _initSessions(ids) {
    if (!this._sessions) {
      throw new Error('no session initialised - this must be injected');
    }

    ids.forEach(id => {
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

    if (this._controller && this._env && this._sessions) {
      return this._controller.model(this._sessions, this._env)
        .then(this._registerPiesIfNeeded)
        .then(this._updateElements)
        .then(dispatchModelUpdated)
        .then(() => ({ skipped: false }));
    } else {
      return Promise.resolve({ skipped: true });
    }
  }


  _registerPiesIfNeeded(models) {

    //TODO: Provide a more thorough check
    const allRegistered = Object.keys(this._pies).length === models.length;

    if (allRegistered) {
      return Promise.resolve(models);
    } else {
      const elements = uniq(models.map(m => {
        if (m.element) {
          return m.element;
        } else {
          const el = this.querySelector(`[pie-id="${m.id}"]`);
          return el ? el.tagName.toLowerCase() : null;
        }
      }));

      const promises = elements.map(e => customElements.whenDefined(e));

      return Promise.all(promises)
        .then(allDefined => {
          models.forEach(m => {
            const el = this.querySelector(`${m.element}[pie-id="${m.id}"]`);

            this._registerPieInstance(m.id, el);
          });
          return models;
        });
    }
  }

  _makeStatusHandler(id) {
    return (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();

      this._statuses[id] = this._statuses[id] || { complete: undefined }
      const status = this._statuses[id];
      status.complete = e.detail.complete;

      this.status()
        .then(statuses => {
          this.dispatchEvent(new CustomEvent('sessions-changed', {
            bubbles: true,
            detail: {
              statuses: statuses
            }
          }));
        });
    }
  }

  _registerPieInstance(id, el) {

    if (!el) {
      throw new Error(`Can't find element for pie-id: ${m.id} and element name: ${m.element}`);
    }

    this._pies[id] = el;

    //TODO: store handlers so we can detach them later
    const statusHandler = this._makeStatusHandler(id);

    /** dispatched when a session is set or changed in the element. */
    el.addEventListener('session-changed', statusHandler);

    /** dispatched when a model is set on the element. */
    el.addEventListener('model-set', statusHandler);
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

  _updateElement(pie, model, id, missingModelOrSession) {
    missingModelOrSession = missingModelOrSession || (() => { });
    let session = this._getOrCreateSession(id);
    if (!model || !session) {
      missingModelOrSession(pie, id);
      return;
    }
    pie.model = model;
    pie.session = session;
  }

  _updateElements(models) {
    const ids = Object.keys(this._pies);
    ids.forEach(id => {
      const pie = this._pies[id];
      const model = find(models, { id });
      this._updateElement(pie, model, id, (pie, id) => console.error('missing model or session for pie: ' + pie));
    });
  }
}

export default PiePlayer;