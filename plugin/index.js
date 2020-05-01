const path = require('path');
const { RawSource } = require('webpack-sources');
const { SyncHook } = require('tapable');
const ColorPalettePlugin = require('./colorPalettePlugin');
const extractVariables = require('./extractVariables');
const generateThemes = require('./generate');
const { pluginName, themeVariable, lessLoaderOptions } = require('./constants');
const RuntimeVariableVisitor = require('./visitors/runtimeVariableVisitor');
const serialize = require('./serialize');
const ResolveVisitor = require('./visitors/resolveVisitor');
const sha1 = require('./sha1');
const DependencyVisitor = require('./visitors/dependencyVisitor');

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

    compiler.hooks[themeVariable] = new SyncHook(['name', 'value']);

    compiler.hooks[themeVariable].tap(
      pluginName,
      (expr) => {
        extractedExprs[expr.name] = expr;
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

      const changedVariableNames = new Set();
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
                changedVariableNames.add(name);
              }
            }
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
      compilation.hooks.finishModules.tapPromise(pluginName, async (modules) => {
        const runtimeExprGroups = {};
        const extractedValues = {};
        const dependencyVisitor = new DependencyVisitor();
        const defineRuntimeExprs = new Map();

        Object.keys(mergedVariableGroups).forEach((themeName, themeIndex) => {
          const runtimeExprs = {};
          const runtimeVariables = {};
          const mergedVariables = mergedVariableGroups[themeName];

          runtimeVariableNames.forEach(
            (name) => {
              runtimeVariables[name] = mergedVariables[name].node;
            }
          );

          Object.keys(extractedExprs).forEach(
            (name) => {
              const expr = extractedExprs[name];
              if (isRuntimeVariable(themeIndex, expr.node)) {
                const node = resolveVisitors[themeIndex].run(expr.node);
                dependencyVisitor.run(node);
                const code = JSON.stringify(serialize(node));
                const hash = sha1(code);
                defineRuntimeExprs.set(hash, code);
                runtimeExprs[name] = {
                  node,
                  code,
                  hash,
                };
              }
            }
          );
          runtimeExprGroups[themeName] = runtimeExprs;
        });

        Object.keys(extractedExprs).forEach(
          (name) => {
            const expr = extractedExprs[name];
            extractedValues[name] = expr.value;
          }
        );


        const themes = await generateThemes(mergedVariableGroups, extractedValues);

        const source = [];

        defineRuntimeExprs.forEach(
          (value, key) => {
            source.push(`var _${key} = ${value};`);
          }
        );

        source.push('var themes = {');

        const themeSource = Object.keys(themes).map(
          (themeName) => {
            const source = [];
            source.push(`${JSON.stringify(themeName)}: { `);
            const themeVariables = themes[themeName];
            const runtimeExprs = runtimeExprGroups[themeName];
            const outputVariables = Object.keys(themeVariables).map(
              (name) => {
                const variable = JSON.stringify(themeVariables[name]);
                const runtimeExpr = runtimeExprs[name];
                if (runtimeExpr) {
                  return (`${JSON.stringify(name)}: { expr: _${runtimeExpr.hash}, default: ${variable} }`);
                }
                return (`${JSON.stringify(name)}: ${variable}`);
              }
            );
            source.push(outputVariables.join(', '));
            source.push(' }');
            return source.join('');
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
