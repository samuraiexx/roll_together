const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const webpack = require("webpack");

module.exports = (env) => {
  return (exports = {
    entry: {
      background: "./src/background.ts",
      popup: "./src/popup.ts",
      options: "./src/options.ts",
      content_script: "./src/content_script.ts",
      root_content_script: "./src/root_content_script.ts",
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
        "process.env.NODE_ENV": JSON.stringify(env.NODE_ENV),
      }),
    ],
  });
};
