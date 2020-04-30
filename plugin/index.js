const path = require('path');
const { RawSource } = require('webpack-sources');
const { SyncHook } = require('tapable');
const ColorPalettePlugin = require('./colorPalettePlugin');
const extractVariables = require('./extractVariables');
const generateThemes = require('./generate');
const { pluginName, themeVariable, lessLoaderOptions } = require('./constants');

const themesModulePath = path.resolve(__dirname, '../lib/themes.js');
class AntdThemePlugin {
  constructor(options) {
    this.options = options;
    this.exprs = new Map();
  }

  apply(compiler) {
    const { options } = this;
    const { exprs } = this;

    let themes = {};

    compiler.hooks[themeVariable] = new SyncHook(['name', 'value']);

    compiler.hooks[themeVariable].tap(
      pluginName,
      (name, valaue) => {
        exprs.set(name, valaue);
      }
    );

    compiler.hooks.beforeCompile.tapPromise(pluginName, async () => {
      const lessOptions = {
        javascriptEnabled: true,
        plugins: [
          new ColorPalettePlugin(),
        ],
      };

      const filenames = [
        require.resolve('antd/lib/style/themes/default.less'),
        ...options.themes.map(({ filename }) => filename),
      ];

      const [defaultVariables, ...themeVariableGroups] = await Promise.all(
        filenames.map(
          (filename) => extractVariables(`@import "${filename}";`, lessOptions)
        )
      );

      const variableNames = Object.keys(defaultVariables);
      const changedVariableNames = [];


      for (let i = 0; i < themeVariableGroups.length; ++i) {
        variableNames.forEach(
          (name) => {
            const themeVariables = themeVariableGroups[i];
            if (themeVariables[name] && defaultVariables[name].expr !== themeVariables[name].expr) {
              changedVariableNames.push(name);
            }
          }
        );
      }

      this.options.themes.forEach(
        (theme, i) => {
          const changedVariables = {};
          changedVariableNames.forEach(
            (name) => {
              changedVariables[name] = themeVariableGroups[i][name] || defaultVariables[name];
            }
          );
          themes[theme.name] = Object.keys(changedVariables).reduce(
            (acc, key) => ({
              ...acc,
              [key]: changedVariables[key].node,
            }),
            {}
          );
        }
      );

      const modifyVars = {};
      changedVariableNames.forEach(
        (name) => {
          modifyVars[name] = `theme(--${name}, ${defaultVariables[name].value})`;
        }
      );

      compiler[lessLoaderOptions] = {
        modifyVars,
      };
    });

    compiler.hooks.thisCompilation.tap(pluginName, (compilation) => {
      compilation.hooks.finishModules.tapPromise(
        pluginName,
        async (modules) => {
          themes = await generateThemes(themes, exprs);
          return modules;
        }
      );

      compilation.mainTemplate.hooks.modules.tap(
        pluginName,
        (source, chunk) => {
          const modules = chunk.getModules();
          modules.forEach((module) => {
            if (themesModulePath && module.resource === themesModulePath) {
              module._source = new RawSource(`module.exports = ${JSON.stringify(themes)};`);
            }
          });
          return source;
        }
      );
    });
  }
}

AntdThemePlugin.loader = path.resolve(__dirname, './loader.js');

module.exports = AntdThemePlugin;
