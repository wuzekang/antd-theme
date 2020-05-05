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

        const nodeReplaceVisitor = new NodeReplaceVisitor();
        nodeReplaceVisitor.run(root);

        root.eval(ctx);

        const variables = root.variables();
        const result = Object.keys(variables).map(
          (key) => {
            const variable = root.variable(key);
            const value = variable.value.eval(ctx);

            return {
              name: key.substr(1),
              node: value,
              value: value.toCSS(ctx),
              expr: variable.value,
            };
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
