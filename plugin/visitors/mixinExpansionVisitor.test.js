
const less = require('less');
const ColorPalettePlugin = require('../colorPalettePlugin');
const MixinExpansionVisitor = require('./mixinExpansionVisitor');
const GuardTransformVisitor = require('./guardTransformVisitor');

const mixinExpansionPlugin = {
  install(_, pluginManager, functionRegistry) {
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

const compileResultEqual = async (input) => {
  const [result1, result2] = await Promise.all([
    compileExpansion(input),
    compileNormal(input),
  ]);

  expect(result1).toBe(result2);
};

test('render styles - button', () => {
  compileResultEqual('@import "node_modules/antd/lib/button/style/index.less";');
});

test('render styles - table', () => {
  compileResultEqual('@import "node_modules/antd/lib/table/style/index.less";');
});


test('render styles - date-picker', () => {
  compileResultEqual('@import "node_modules/antd/lib/date-picker/style/index.less";');
});


test('render styles - time-picker', () => {
  compileResultEqual('@import "node_modules/antd/lib/time-picker/style/index.less";');
});
