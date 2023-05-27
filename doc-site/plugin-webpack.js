module.exports = function (context, opts) {
  return {
    name: "plugin-allow-mjs-webpack",
    configureWebpack(config) {
      config.module.rules.unshift({
        test: /\.m?js$/,
        resolve: {
          fullySpecified: false,
        },
      });
    },
  };
};
