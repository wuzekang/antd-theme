const less = require('less');

class ReductionVisitor {
  constructor() {
    this._visitor = new less.visitors.Visitor(this);
    this.isReplacing = true;
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

  visitCall(node) {
    if (!node.var) {
      return node;
    }

    const name = node.args[0];
    if (!(name instanceof less.tree.Keyword)) {
      return this.visit(name);
    }

    const variableName = name.value.substr(2);
    return new less.tree.Variable(`@${variableName}`);
  }
}


module.exports = ReductionVisitor;
