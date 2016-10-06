import _ from 'lodash';

export default class PiePlayer extends HTMLElement{

  createdCallback(){
    console.log('created');
  }
  
  attachedCallback(){
    console.log('attached');
    let event = new CustomEvent('pie-player-ready', {bubbles: true});
    this.dispatchEvent(event);
  }

  set controller(c){
   this._controller = c; 
   this._update();
  }

  set env(e){
    this._env = e;
    this._update();
  }

  set session(s){
   
   if(!_.isArray(s)){
     throw new Error('session must be an array');
   }

   this._session = s; 
   this._update();
  }

  getOutcome(){
    return this._controller.outcome(this._session, this._env);
  }

  _initSession(ids){
    if(!this._session){
      throw new Error('no session initialised - this must be injected');
    } 

    _.forEach(ids, (id) => {
      let hasId = _.find(this._session, {id: id});
      if(!hasId){
        this._session.push({id: id});
      }
    });
  };

  _update(){
    if(this._controller && this._env && this._session){

      //TODO - what's the best way for the player to extract it's contents?
      let els = this.querySelectorAll('[data-id]');

      let idToEls = [];
      els.forEach((e) => idToEls.push({id: e.getAttribute('data-id'), el: e}));

      let ids = _.map(idToEls, 'id');
      this._initSession(ids);

      let applyModelAndSession = (models) => {
        _.map(idToEls, (ie) => {
          let model = _.find(models, {id: ie.id});
          let session = _.find(this._session, {id: ie.id});
          if(model && session){
            ie.el.model = model;
            ie.el.session = session;
          } else {
            console.error('missing either a model or a sessio: ', model, session);
          }
        });
      };

      let dispatchModelUpdated = () => {
        let event = new CustomEvent('pie', {
          detail: {
            type: 'modelUpdated'
          }
        });
        console.log('dispatch event..');
        this.dispatchEvent(event);
      };

      this._controller.model(this._session, this._env)
        .then(applyModelAndSession)
        .then(dispatchModelUpdated);
    }
  }
}