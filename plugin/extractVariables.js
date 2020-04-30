const less = require('less');
const NodeReplaceVisitor = require('./visitors/nodeReplaceVisitor');

const extractVariables = (input, options) => new Promise(
  (resolve, reject) => {
    less.parse(input, options, (err, root, imports, options) => {
      if (err) {
        reject(err);
        return;
      }
      try {
        const ctx = new less.contexts.Eval(options, [root]);
        const ctxExpr = new less.contexts.Eval(options, [root]);

        ctxExpr.inRuntimeCall = true;
        ctxExpr.isMathOn = () => false;

        const nodeReplaceVisitor = new NodeReplaceVisitor();
        nodeReplaceVisitor.run(root);

        root.eval(ctx);

        const variables = root.variables();
        const result = Object.keys(variables).reduce(
          (acc, key) => {
            const { value } = variables[key].eval(ctx);
            const expr = variables[key].value.eval(ctxExpr).toCSS(ctxExpr);
            return ({
              ...acc,
              [key.substr(1)]: {
                node: value,
                value: value.toCSS(ctx),
                expr,
              },
            });
          },
          {}
        );

        resolve(
          result
        );
      }
      catch (e) {
        reject(e);
      }
    });
  }
);

module.exports = extractVariables;
