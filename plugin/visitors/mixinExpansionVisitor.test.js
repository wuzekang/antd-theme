
const less = require('less');
const ColorPalettePlugin = require('../colorPalettePlugin');
const NodeReplaceVisitor = require('./nodeReplaceVisitor');
const MixinExpansionVisitor = require('./mixinExpansionVisitor');
const GuardTransformVisitor = require('./guardTransformVisitor');

const mixinExpansionPlugin = {
  install(_, pluginManager, functionRegistry) {
    pluginManager.addVisitor(new NodeReplaceVisitor(functionRegistry));
    pluginManager.addVisitor(new MixinExpansionVisitor(functionRegistry));
    pluginManager.addVisitor(new GuardTransformVisitor(functionRegistry));
  },
};

const compileExpansion = async (input) => {
  const { css } = await less.render(
    input,
    {
      javascriptEnabled: true,
      plugins: [
        new ColorPalettePlugin(),
        mixinExpansionPlugin,
      ],
    }
  );
  return css;
};

const compileNormal = async (input) => {
  const { css } = await less.render(
    input,
    {
      javascriptEnabled: true,
      plugins: [
        new ColorPalettePlugin(),
      ],
    }
  );
  return css;
};

const compile = (input) => Promise.all([
  compileExpansion(input),
  compileNormal(input),
]);

[
  'button',
  'notification',
  'table',
  'date-picker',
  'time-picker',
].forEach(
  (name) => {
    test(`render styles - ${name}`, async () => {
      const [r1, r2] = await compile(`@import "node_modules/antd/lib/${name}/style/index.less";`);
      expect(r1).toBe(r2);
    });
  }
);
