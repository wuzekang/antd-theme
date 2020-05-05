const path = require('path');
const { RawSource } = require('webpack-sources');
const { SyncWaterfallHook } = require('tapable');
const ColorPalettePlugin = require('./colorPalettePlugin');
const extractVariables = require('./extractVariables');
const { pluginName, lessLoaderOptions } = require('./constants');
const RuntimeVariableVisitor = require('./visitors/runtimeVariableVisitor');
const serialize = require('./serialize');
const ResolveVisitor = require('./visitors/resolveVisitor');
const sha1 = require('./sha1');
const LessThemePlugin = require('./lessThemePlugin');

const themesModulePath = path.resolve(__dirname, '../lib/themes.js');
const defaultThemeName = 'default';

class AntdThemePlugin {
  constructor(options) {
    this.options = options;
  }

  apply(compiler) {
    const { options } = this;

    const extractedExprs = {};
    const mergedVariableGroups = {};
    const changedVariableNames = new Map();

    const themes = options.themes || [];

    const runtimeVariableNames = options.variables || [];
    const runtimeVariableVisitors = [];
    const resolveVisitors = [];
    const isRuntimeVariable = (i, node, variableName) => {
      if (runtimeVariableNames.length === 0) {
        return false;
      }
      return runtimeVariableVisitors[i].include(node, variableName);
    };


    compiler.hooks[lessLoaderOptions] = new SyncWaterfallHook(['options']);

    compiler.hooks[lessLoaderOptions].tap(
      pluginName,
      (options) => ({
        ...options,
        javascriptEnabled: true,
        plugins: [
          new LessThemePlugin(
            (expr) => {
              extractedExprs[expr.name] = expr;
            },
            changedVariableNames
          ),
        ],
      })
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
        ...themes.map(({ filename }) => filename),
      ];

      const [defaultVariables, ...themeVariableGroups] = await Promise.all(
        filenames.map(
          (filename) => extractVariables(`@import "${filename}";`, lessOptions)
        )
      ).then(
        (variableGroups) => variableGroups.map(
          (variables) => variables.reduce(
            (acc, variable) => ({
              ...acc,
              [variable.name]: variable,
            }),
            {}
          )
        )
      );

      mergedVariableGroups[defaultThemeName] = defaultVariables;
      this.options.themes.forEach(
        (theme, i) => {
          mergedVariableGroups[theme.name] = {
            ...defaultVariables,
            ...themeVariableGroups[i],
          };
        }
      );

      Object.keys(mergedVariableGroups).forEach(
        (name, i) => {
          runtimeVariableVisitors[i] = new RuntimeVariableVisitor(
            runtimeVariableNames,
            mergedVariableGroups[name]
          );
          resolveVisitors[i] = new ResolveVisitor(
            runtimeVariableNames,
            mergedVariableGroups[name]
          );
        }
      );

      Object.keys(mergedVariableGroups).forEach(
        (themeName, themeIndex) => {
          const themeVariables = mergedVariableGroups[themeName];
          Object.keys(themeVariables).forEach(
            (name) => {
              const themeVariable = themeVariables[name];
              themeVariables[name] = {
                ...themeVariable,
                runtime: isRuntimeVariable(themeIndex, themeVariable.expr, themeVariable.name),
              };
            }
          );
        }
      );


      Object.values(mergedVariableGroups).forEach(
        (themeVariables, i) => {
          if (i === 0) {
            return;
          }
          Object.values(themeVariables).forEach(
            (themeVariable) => {
              const { name } = themeVariable;
              const defaultVariable = defaultVariables[name];
              if (!defaultVariable) {
                return;
              }
              if (themeVariable.runtime || defaultVariable.value !== themeVariable.value) {
                changedVariableNames.set(name, defaultVariable.node);
              }
            }
          );
        }
      );
    });

    compiler.hooks.thisCompilation.tap(pluginName, (compilation) => {
      compilation.hooks.finishModules.tapPromise(pluginName, async (modules) => {
        const resolvedExprGroups = {};
        const defineRuntimeExprs = new Map();

        Object.keys(mergedVariableGroups).forEach((themeName, themeIndex) => {
          const resolvedExprs = {};
          Object.keys(extractedExprs).forEach(
            (name) => {
              const expr = extractedExprs[name];
              const resolved = resolveVisitors[themeIndex].run(expr.node);
              if (resolved.runtime) {
                const code = JSON.stringify(serialize(resolved.expr));
                const hash = sha1(code);
                resolved.hash = hash;
                defineRuntimeExprs.set(hash, code);
              }
              resolvedExprs[name] = resolved;
            }
          );
          resolvedExprGroups[themeName] = resolvedExprs;
        });


        const source = [];
        defineRuntimeExprs.forEach(
          (value, key) => {
            source.push(`var _${key} = ${value};`);
          }
        );

        source.push('var themes = {');

        const themeSource = Object.keys(resolvedExprGroups).map(
          (themeName) => {
            const source = [];
            source.push(`${JSON.stringify(themeName)}: {`);
            const resolvedExprs = resolvedExprGroups[themeName];
            const outputVariables = Object.keys(resolvedExprs).map(
              (name) => {
                const value = JSON.stringify(resolvedExprs[name].value);
                const resolvedExpr = resolvedExprs[name];
                if (resolvedExpr.runtime) {
                  return (`${JSON.stringify(name)}: { expr: _${resolvedExpr.hash}, default: ${value} }`);
                }
                return (`${JSON.stringify(name)}: ${value}`);
              }
            );
            source.push(outputVariables.join(',\n'));
            source.push('}');
            return source.join('\n');
          }
        );

        source.push(themeSource.join(', '));
        source.push('};');
        source.push('module.exports = themes;');
        const content = source.join('\n');

        modules.forEach(
          (module) => {
            if (themesModulePath && module.resource === themesModulePath) {
              module._source = new RawSource(content);
            }
          }
        );
      });
    });
  }
}

AntdThemePlugin.loader = path.resolve(__dirname, './loader.js');

module.exports = AntdThemePlugin;
