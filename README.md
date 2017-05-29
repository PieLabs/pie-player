# pie-player

A custom element for containing a [pie](http;//github.com/PieLabs) player.

## usage


[see here for more information](https://pielabs.github.io/pie-website/docs/using/pie-player-api/).

Create the element in the markup and wait for the `pie-player-ready` event, in the handler set the properties:

* `session` - an array of session data
* `env` - an env object 
* `controllers` - an object that exposes some methods for processing: 
  * `model(ids, session, env) => Promise<Array[{}]>` - this is used for setting the model data on the ui elements

```html

<script type="text/javascript">

  document.addEventListener('DOMContentLoaded', function(){
    var player = document.querySelector('pie-player');
    player.addEventListener('ready', function(){
      player.controllers = //..
      player.session(session)
        .then(() => player.env(env))
        .then(() => console.log('player is ready'))
        
    });
  });
</script>
<pie-player>
  <my-pie-element data-id="1"></my-pie-element>
</pie-player>
```

# Browser Integration

This package exports an `es6` module, so you'll have to include it in a build tool like [webpack](http://webpack.github.io) and [babel](http://babel.github.io).

# Unit testing

* runs selenium > requires jdk 1.8

We use [webpack](http://webpack.github.io) and [web-component-tester](http://github.com/Polymer/web-component-tester) to test the element. Webpack builds a test bundler and the `wct` runs the test suite.

``` 
npm test
```

# release

```bash
npm run release
```
