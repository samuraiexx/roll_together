// @ts-check
const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const webpack = require("webpack");

// Environment variables
/** @typedef {{SERVER_URL: string}} EnvJson */
/** @typedef {{development: EnvJson, production: EnvJson}} EnvJsonFile */
/** @type {EnvJsonFile} */
const envVariables = require("./env.json");

module.exports = (env) => {
  console.log(env);

  /** @type {webpack.Configuration} */
  const config = {
    mode: env.production ? "production" : "development",
    entry: {
      background: "./src/background.ts",
      popup: "./src/popup.ts",
      options: "./src/options.ts",
      content_script: "./src/content_script.ts",
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: "ts-loader",
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      extensions: [".tsx", ".ts", ".js"],
    },
    output: {
      filename: "[name].js",
      path: path.resolve(__dirname, "build"),
    },
    optimization: { minimize: false },
    devtool: env.production ? false : "inline-source-map",
    plugins: [
      // @ts-ignore
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
      // @ts-ignore
      new CleanWebpackPlugin(),
      new webpack.EnvironmentPlugin(env.production ? envVariables.production : envVariables.development)
    ],
  };

  return (exports = config);
};
