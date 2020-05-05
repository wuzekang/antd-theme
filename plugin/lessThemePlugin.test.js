const less = require('less');
const LessThemePlugin = require('./lessThemePlugin');
const ColorPalettePlugin = require('./colorPalettePlugin');
const extractVariables = require('./extractVariables');
const RuntimeVariableVisitor = require('./visitors/runtimeVariableVisitor');
const ResolveVisitor = require('./visitors/resolveVisitor');
const serialize = require('./serialize');
const sha1 = require('./sha1');

const defaultThemeName = 'default';

const initialize = async (options) => {
  const mergedVariableGroups = {};
  const changedVariableNames = new Map();
  const runtimeVariableNames = options.variables || [];
  const runtimeVariableVisitors = [];
  const resolveVisitors = [];
  const isRuntimeVariable = (i, node, variableName) => {
    if (runtimeVariableNames.length === 0) {
      return false;
    }
    return runtimeVariableVisitors[i].include(node, variableName);
  };

  const lessOptions = {
    javascriptEnabled: true,
    plugins: [
      new ColorPalettePlugin(),
      // {
      //   install: (_, pluginManager) => {
      //     pluginManager.addVisitor(new NodeReplaceVisitor(new Map()));
      //   },
      // },
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
  options.themes.forEach(
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

  return {
    mergedVariableGroups,
    changedVariableNames,
    resolveVisitors,
    isRuntimeVariable,
  };
};

const main = async () => {
  const {
    mergedVariableGroups, changedVariableNames, resolveVisitors, isRuntimeVariable,
  } = await initialize({
    variables: ['primary-color'],
    themes: [
      {
        name: 'dark',
        filename: require.resolve('antd/lib/style/themes/dark.less'),
      },
      {
        name: 'compact',
        filename: require.resolve('antd/lib/style/themes/compact.less'),
      },
      {
        name: 'aliyun',
        filename: require.resolve('@ant-design/aliyun-theme/index.less'),
      },
    ],
  });

  const input = [
    '@import "node_modules/antd/lib/button/style/index.less";',
    '@import "node_modules/antd/lib/tree/style/index.less";',
  ].join('\n');

  const extractedExprs = new Map();

  const { css } = await less.render(input, {
    javascriptEnabled: true,
    plugins: [
      new LessThemePlugin(
        (expr) => {
          extractedExprs[expr.name] = expr;
        },
        changedVariableNames
      ),
    ],
  });

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
};

test('e2e', main);
