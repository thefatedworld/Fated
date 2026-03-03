const { withAppBuildGradle } = require('expo/config-plugins');

module.exports = function withIAPStore(config) {
  return withAppBuildGradle(config, (config) => {
    if (
      config.modResults.contents.includes("missingDimensionStrategy 'store'")
    ) {
      return config;
    }

    config.modResults.contents = config.modResults.contents.replace(
      /defaultConfig\s*{/,
      `defaultConfig {\n        missingDimensionStrategy 'store', 'play'`
    );

    return config;
  });
};
