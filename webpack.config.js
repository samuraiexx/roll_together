const path = require('path');
const CopyPlugin = require("copy-webpack-plugin");
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const webpack = require('webpack');

module.exports = env => {
  const NODE_ENV = env && env.NODE_ENV ? env.NODE_ENV : 'dev';

  const exports = {
    entry: {
      background: './src/background.ts',
      popup: './src/popup.ts',
      options: './src/options.ts',
      content_script: './src/content_script.ts'
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
    },
    output: {
      filename: '[name].js',
      path: path.resolve(__dirname, 'build'),
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          { from: "manifest.json" },
          { from: "src/fonts", to: "fonts" },
          { from: "src/images", to: "images" },
          { from: "src/options.html" },
          { from: "src/popup.html" },
          { from: "src/styles.css" },
        ],
      }),
      new CleanWebpackPlugin(),
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': NODE_ENV
      }),
    ]
  };

  if (NODE_ENV === 'dev') {
    // exports.devtool = 'eval-source-map';
  }

  return exports;
};