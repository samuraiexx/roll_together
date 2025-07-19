// @ts-check
const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const webpack = require("webpack");

// Environment variables
/** @typedef {{SYNC_SERVER: string}} EnvJson */
/** @typedef {{development: EnvJson, production: EnvJson}} EnvJsonFile */
/** @type {EnvJsonFile} */
const envVariables = require("./env.json");

module.exports = (env) => {
  console.log(env);

  const isFirefox = env.firefox || false;
  const manifestFile = isFirefox ? "manifest.firefox.json" : "manifest.json";
  const outputDir = isFirefox ? "build-firefox" : "build";

  /** @type {webpack.Configuration} */
  const config = {
    mode: env.production ? "production" : "development",
    entry: {
      service_worker: "./src/service_worker.ts",
      content_script: "./src/content_script.ts",
      popup: "./src/popup.ts",
      options: "./src/options.ts",
      "browser-compat": "./src/browser-compat.ts",
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
      path: path.resolve(__dirname, outputDir),
    },
    optimization: { minimize: false },
    devtool: env.production ? false : "inline-source-map",
    plugins: [
      // @ts-ignore
      new CopyPlugin({
        patterns: [
          { from: manifestFile, to: "manifest.json" },
          { from: "src/fonts", to: "fonts" },
          { from: "src/images", to: "images" },
          { from: "src/options.html" },
          { from: "src/popup.html" },
          { from: "src/styles.css" },
        ],
      }),
      // @ts-ignore
      new CleanWebpackPlugin(),
      new webpack.EnvironmentPlugin(
        env.production ? envVariables.production : envVariables.development
      ),
    ],
  };

  // @ts-ignore
  return (exports = config);
};
