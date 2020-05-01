const less = require('less');

class DependencyVisitor {
  constructor() {
    this._visitor = new less.visitors.Visitor(this);
    this.isReplacing = false;
    this.nodeTypes = new Set();
    this.functions = new Set();
  }

  run(root) {
    return this._visitor.visit(root);
  }


  visitNegative(node) {
    this.nodeTypes.add(node.type);
    return node;
  }

  visitVariable(node) {
    this.nodeTypes.add(node.type);
    return node;
  }

  visitOperation(node) {
    this.nodeTypes.add(node.type);
    return node;
  }

  visitCall(node) {
    this.functions.add(node.name);
    this.nodeTypes.add(node.type);
    return node;
  }
}

module.exports = DependencyVisitor;
