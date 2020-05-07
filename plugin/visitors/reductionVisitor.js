const less = require('less');

const { Node, Anonymous } = less.tree;

class ReductionVisitor {
  constructor() {
    this._visitor = new less.visitors.Visitor(this);
    this.isReplacing = true;
  }

  run(root) {
    return this._visitor.visit(root);
  }

  visit(root) {
    const fn = this[`visit${root.type}`];
    return fn ? fn.call(this, root) : root;
  }

  visitCondition(node) {
    if (node.lvalue instanceof Node && node.rvalue instanceof Node) {
      return node;
    }
    return node._operate(
      node.lvalue instanceof Node ? node.lvalue : new Anonymous(node.lvalue),
      node.rvalue instanceof Node ? node.rvalue : new Anonymous(node.rvalue)
    );
  }

  visitCall(node) {
    if (node.name === 'if') {
      const [expr, truepart, falsepart = new Anonymous()] = node.args;
      const condition = this.visit(expr);
      if (!(condition instanceof Node)) {
        return condition ? truepart : falsepart;
      }
    }
    return node;
  }
}

module.exports = ReductionVisitor;
