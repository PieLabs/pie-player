import Elements from './elements';
import _ from 'lodash';

export default class PiePlayer extends HTMLElement {

  constructor() {
    super();
    this._pies = {};

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
    if (!_.isArray(s)) {
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

  getOutcome() {
    return this._controller.outcome(this._session, this._env);
  }

  _initSession(ids) {
    if (!this._session) {
      throw new Error('no session initialised - this must be injected');
    }

    _.forEach(ids, (id) => {
      let hasId = _.find(this._session, { id: id });
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

    let existing = _.find(this._session, { id: id });
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
    let model = _.find(this._latestModels, { id: id });
    let session = this._getOrCreateSession(id);
    if (!model || !session) {
      missingModelOrSession(pie, id);
      return;
    }
    pie.model = model;
    pie.session = session;
  }

  _updateElements() {
    _.forEach(
      this._pies,
      (pie, id) => {
        this._updateElement(pie, id, (pie, id) => console.error('missing model or session for pie: ' + pie));
      }
    );
  }
}
