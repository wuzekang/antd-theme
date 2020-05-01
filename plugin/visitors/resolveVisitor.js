const less = require('less');

const MATH = {
  ALWAYS: 0,
  PARENS_DIVISION: 1,
  PARENS: 2,
  STRICT_LEGACY: 3,
};

class ResolveVisitor {
  constructor(runtimeVariableNames, variables) {
    this._visitor = new less.visitors.Visitor(this);
    this.isReplacing = true;
    this.lookup = new Set();
    this.functions = new Set();
    this.variables = variables;
    this.context = new less.contexts.Eval();
    runtimeVariableNames.forEach(
      (name) => this.lookup.add(name)
    );
  }

  run(root) {
    return this._visitor.visit(new less.tree.Value([root]));
  }

  visit(root) {
    const fn = this[`visit${root.type}`];
    return fn ? fn.call(this, root) : root;
  }

  visitValue(node) {
    if (node.value.length === 1) {
      return this.visit(node.value[0]);
    }
    return node;
  }

  visitExpression(node) {
    const { context } = this;

    const resolve = () => {
      let returnValue;
      const mathOn = context.isMathOn();

      const inParenthesis = node.parens
          && (context.math !== MATH.STRICT_LEGACY || !node.parensInOp);

      let doubleParen = false;
      if (inParenthesis) {
        context.inParenthesis();
      }
      if (node.value.length > 1) {
        return node;
      }
      if (node.value.length === 1) {
        if (node.value[0].parens && !node.value[0].parensInOp && !context.inCalc) {
          doubleParen = true;
        }
        // eslint-disable-next-line prefer-destructuring
        returnValue = node.value[0];
      }
      else {
        return node;
      }
      if (inParenthesis) {
        context.outOfParenthesis();
      }
      if (node.parens && node.parensInOp && !mathOn && !doubleParen
          && (!(returnValue instanceof less.tree.Dimension))) {
        return node;
      }
      return returnValue || node;
    };

    const resolved = resolve(node);
    if (resolved !== node) {
      return this.visit(resolved);
    }
    return node;
  }

  visitVariable(node) {
    const name = node.name.substr(1);
    if (this.lookup.has(name)) {
      return node;
    }
    return this.visit(this.variables[name].expr);
  }

  visitCall(node) {
    if (!node.var) {
      this.functions.add(node.name);
      return node;
    }

    const name = node.args[0];
    if (!(name instanceof less.tree.Keyword)) {
      return this.visit(name);
    }

    const variableName = name.value.substr(2);
    return this.visit(new less.tree.Variable(`@${variableName}`));
  }
}

module.exports = ResolveVisitor;
