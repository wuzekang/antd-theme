const loaderUtils = require('loader-utils');
const ColorPalettePlugin = require('./colorPalettePlugin');
const LessThemePlugin = require('./lessThemePlugin');
const { themeVariable, lessLoaderOptions } = require('./constants');

const loadedThemedStylesPath = require.resolve('@microsoft/load-themed-styles');


function loader(content) {
  const { namedExport, async = false } = loaderUtils.getOptions(this) || {};
  let exportName = 'module.exports';
  if (namedExport) {
    exportName += `.${namedExport}`;
  }

  return [
    'var content = (function (module) {',
    'var css = { id: module.id, exports: {} };',
    '(function (module) {',
    content,
    '})(css);',
    'return css.exports;',
    '}) (module);',
    `var loader = require(${JSON.stringify(loadedThemedStylesPath)});`,
    '',
    'if(typeof content === "string") content = [[module.id, content]];',
    '',
    '// add the styles to the DOM',
    `for (var i = 0; i < content.length; i++) loader.loadStyles(content[i][1], ${async === true});`,
    '',
    `if(content.locals) ${exportName} = content.locals;`,
  ].join('\n');
}

function pitch() {
  const { loaders } = this;

  this.loaders = loaders.map(
    (loader) => {
      if (loader.path === require.resolve('less-loader')) {
        return {
          ...loader,
          options: {
            ...loader.options,
            ...this._compiler[lessLoaderOptions],
            javascriptEnabled: true,
            plugins: [
              new ColorPalettePlugin(),
              new LessThemePlugin((name, value) => {
                this._compiler.hooks[themeVariable].call(name, value);
              }),
            ],
          },
        };
      }
      return loader;
    }
  );
}

module.exports = loader;
module.exports.pitch = pitch;
