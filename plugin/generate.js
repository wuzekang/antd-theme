const less = require('less');
const ColorPalettePlugin = require('./colorPalettePlugin');

const generateTheme = async (variables, exprs) => {
  const strs = [];

  exprs.forEach(
    (_, key) => strs.push(`@${key}: ${exprs.get(key)};`)
  );

  strs.push('.theme {');

  exprs.forEach(
    (_, key) => strs.push(`${key}: @${key};`)
  );

  strs.push('}');

  const theme = {};
  await less.render(
    strs.join('\n'),
    {
      plugins: [
        new ColorPalettePlugin(),
        {
          install: (less, pluginManager, functions) => {
            functions.add('theme', (name) => {
              if (name instanceof less.tree.Keyword) {
                return variables[name.value.substr(2)];
              }
              return name;
            });

            class VarExtractVisitor {
              constructor() {
                this._visitor = new less.visitors.Visitor(this);
                this.isReplacing = false;
                this.isPreEvalVisitor = false;
              }

              run(root) {
                return this._visitor.visit(root);
              }

              visitDeclaration(node) {
                theme[node.name] = node.value.toCSS();
              }
            }

            pluginManager.addVisitor(new VarExtractVisitor());
          },
        },
      ],
    }
  );
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
