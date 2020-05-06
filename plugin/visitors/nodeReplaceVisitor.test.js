const less = require('less');
const fs = require('fs');
const pLimit = require('p-limit');
const NodeReplaceVisitor = require('./nodeReplaceVisitor');

const limit = pLimit(1);

const nodeReplacePlugin = {
  install(_, pluginManager, functionRegistry) {
    pluginManager.addVisitor(new NodeReplaceVisitor(functionRegistry, null));
  },
};

const compileNodeReplace = async (input) => {
  const { css } = await less.render(input, {
    javascriptEnabled: true,
    plugins: [nodeReplacePlugin],
  });
  return css;
};

const compileNormal = async (input) => {
  const { css } = await less.render(input, {
    javascriptEnabled: true,
  });
  return css;
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

describe('replace', () => {
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
          return Promise.all([
            compileNodeReplace(input),
            compileNormal(input),
          ]);
        }
      ),
    })
  );

  tests.forEach(
    ({ name, compiled }) => {
      test(name, async () => {
        const [r1, r2] = await compiled;
        expect(r1).toBe(r2);
      });
    }
  );
});
