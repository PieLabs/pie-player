import _ from 'lodash';

export default class PiePlayer extends HTMLElement {

  createdCallback() {
    console.log('created');

    this.addEventListener('pie.register', (event) => {
      //stop the event from bubbling further
      event.preventDefault();
      event.stopImmediatePropagation();
      let id = event.target.getAttribute('data-id');
      if (this._pies[id]) {
        throw new Error('a pie with that id (' + id + ') is already registered: ' + this._pies[id]);
      }
      this._pies[id] = event.target;
      this._updateElement(event.target, id);
    });
  }

  attachedCallback() {
    console.log('attached');
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
  }

  set session(s) {

    if (!_.isArray(s)) {
      throw new Error('session must be an array');
    }

    this._session = s;
    this._update();
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

    if (this._controller && this._env && this._session) {
      this._controller.model(this._session, this._env)
        .then((models) => {
          this._latestModels = models;
          this._updateElements();
        })
        .then(dispatchModelUpdated);
    }
  }

  _updateElement(pie, id, missingModelOrSession) {
    missingModelOrSession = missingModelOrSession || (() => { });
    let model = _.find(this._latestModels, { id: id });
    let session = _.find(this._session, { id: id });
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

  //     //TODO - what's the best way for the player to extract it's contents?

  //     //1: immediate children // wont work - say one is in a table?
  //     //2. query controller? but if the controller is on the server this could be slow
  //     //3. query by 'pie-element' attribute? it'd mean the markup would need to be tweaked
  //     //4. find all and filter the elements that support `model` and `session` and have a 'data-id'
  //     let els = this.querySelectorAll('[pie-id]');

  //     let idToEls = [];
  //     els.forEach((e) => {
  //       idToEls.push({ id: e.getAttribute('pie-id'), el: e });

  //       let ids = _.map(idToEls, 'id');
  //       this._initSession(ids);

  //       let applyModelAndSession = (models) => {
  //         _.map(idToEls, (ie) => {
  //           let model = _.find(models, { id: ie.id });
  //           let session = _.find(this._session, { id: ie.id });
  //           if (model && session) {
  //             ie.el.model = model;
  //             ie.el.session = session;
  //           } else {
  //             console.error('missing either a model or a sessio: ', model, session);
  //           }
  //         });
  //       };


  //       this._controller.model(this._session, this._env)
  //         .then(applyModelAndSession)
  //         .then(dispatchModelUpdated);
  //     }
  // }
  // }