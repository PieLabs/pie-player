const path = require('path');

module.exports = {
  //devtool: 'eval-source-map',
  entry: {
    demo: './test-build/entry.js'
  },
  output: {
    path: path.resolve('./test'),
    filename: 'bundle.js',
  },
  module: {
  }
};

