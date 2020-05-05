const less = require('less');

class ThemeExtractVisitor {
  constructor(callback) {
    this._visitor = new less.visitors.Visitor(this);
    this.isReplacing = false;
    this.isPreEvalVisitor = false;
    this.callback = callback;
  }

  run(root) {
    return this._visitor.visit(root);
  }

  visitMuteable(node) {
    this.callback({
      name: node.varName(),
      node,
    });
  }
}

module.exports = ThemeExtractVisitor;
