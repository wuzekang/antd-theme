const less = require('less');
const colorPalette = require('../lib/colorPalette');

const generateTheme = async (variables, exprs) => {
  const frame = new less.tree.Ruleset(
    null,
    Object.keys(variables).map((name) => new less.tree.Declaration(
      `@${name}`,
      variables[name].node
    ))
  );

  frame.functionRegistry = less.functions.functionRegistry.inherit();
  frame.functionRegistry.add(
    'colorPalette', (color, index) => new less.tree.Color(colorPalette(color, index))
  );
  frame.functionRegistry.add(
    'theme', (name) => {
      if (name instanceof less.tree.Keyword) {
        return variables[name.value.substr(2)].node;
      }
      return name;
    }
  );
  const ctx = new less.contexts.Eval({ math: 0 }, [frame]);

  const theme = {};
  Object.keys(exprs).forEach((name) => {
    theme[name] = exprs[name].node.eval(ctx).toCSS(ctx);
  });
  return theme;
};

const generateThemes = async (computedModifyVars, exprs) => {
  const themes = await Promise.all(
    Object.keys(computedModifyVars).map(
      async (name) => {
        const theme = await generateTheme(computedModifyVars[name], exprs);
        return {
          name,
          theme,
        };
      }
    )
  );

  return themes.reduce(
    (acc, { name, theme }) => ({ ...acc, [name]: theme }), {}
  );
};

module.exports = generateThemes;
