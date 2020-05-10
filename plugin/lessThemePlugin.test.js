const less = require('less');
const fs = require('fs');
const pLimit = require('p-limit');
const LessThemePlugin = require('./lessThemePlugin');
const ColorPalettePlugin = require('./colorPalettePlugin');
const extractVariables = require('./extractVariables');
const RuntimeVariableVisitor = require('./visitors/runtimeVariableVisitor');
const ResolveVisitor = require('./visitors/resolveVisitor');
const serialize = require('./serialize');
const sha1 = require('./sha1');

const limit = pLimit(1);


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
        mergedVariableGroups[name],
        runtimeVariableVisitors[i]
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
  };
};

const options = {
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
};

const compileThemes = async (options, input) => {
  const {
    mergedVariableGroups, changedVariableNames, resolveVisitors,
  } = await initialize(options);


  const extractedExprs = new Map();

  const { css } = await less.render(input, {
    javascriptEnabled: true,
    plugins: [
      new LessThemePlugin(
        (expr) => {
          extractedExprs[expr.name] = expr;
        },
        {
          has: (key) => changedVariableNames.has(key),
          get: (key) => changedVariableNames.get(key),
        }
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
};


const components = [
  'affix',
  'alert',
  'anchor',
  'auto-complete',
  'avatar',
  'back-top',
  'badge',
  'breadcrumb',
  'button',
  'calendar',
  'carousel',
  'card',
  'cascader',
  'checkbox',
  'col',
  'collapse',
  'comment',
  'config-provider',
  'date-picker',
  'descriptions',
  'divider',
  'drawer',
  'dropdown',
  'empty',
  'form',
  'grid',
  'icon',
  'input',
  'input-number',
  'layout',
  'list',
  'locale-provider',
  'mentions',
  'menu',
  'message',
  'modal',
  'notification',
  'page-header',
  'pagination',
  'popconfirm',
  'popover',
  'progress',
  'radio',
  'rate',
  'result',
  'row',
  'select',
  'skeleton',
  'slider',
  'space',
  'spin',
  'statistic',
  'steps',
  'switch',
  'table',
  'tabs',
  'tag',
  'timeline',
  'time-picker',
  'tooltip',
  'transfer',
  'tree',
  'tree-select',
  'typography',
  'upload',
  'version',
];

describe('compile themes', () => {
  const tests = components.map(
    (name) => ({
      name,
      filename: require.resolve(`antd/lib/${name}/style/index`).replace(/js$/, 'less'),
    })
  ).filter(
    ({ filename }) => fs.existsSync(filename)
  ).map(
    ({ name, filename }) => ({
      name,
      compiled: limit(
        () => {
          const input = (`@import "${filename}";`);
          return compileThemes(options, input);
        }
      ),
    })
  );

  tests.forEach(
    ({ name, compiled }) => {
      // eslint-disable-next-line jest/expect-expect
      test(name, () => compiled);
    }
  );
});
