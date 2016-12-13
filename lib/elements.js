import _ from 'lodash';


export default class Elements {

  constructor(root, models) {
    this.root = root;
    this.models = models;

    let upgradePromises = _.map(models, (m) => customElements.whenDefined(m.element));

    let returnElement = (m) => {
      let el = root.querySelector(`${m.element}[data-id="${m.id}"]`);
      if (el) {
        return { id: m.id, element: el };
      }
    }

    let setData = (d) => {
      let {element, id} = d;

      if (!element) {
        throw new Error('el not defined');
      }

      if (this._env) {
        element.env = this._env;
      }

      let data = _.find(this.models, { id: id });

      _.forEach(data, (value, key) => {
        if (key !== 'id' && key !== 'element') {
          element[key] = value;
        }
      });
    }

    Promise.all(upgradePromises)
      .then(() => {
        this._elements = _(models).map(returnElement).compact().value();
        _.forEach(this._elements, setData);
      });
  }

  set env(e) {
    this._env = e;

    if (this._elements && this._env) {
      _.forEach(this._elements, (d) => {
        d.element.env = this._env;
      });
    }
  }
}