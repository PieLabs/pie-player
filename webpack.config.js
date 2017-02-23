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
        test: /\.css$/,
        loader: "style-loader!css-loader"
      }
    ]
  }
};

