module.exports = {
  entry: {
    demo: './test-build/entry.js'
  },
  output: {
    path: "./test",
    filename: 'bundle.js',
  },
  module: {
    loaders: [
      {
        test: /\.less$/,
        loader: "style!css!less"
      }
    ]
  }
};

