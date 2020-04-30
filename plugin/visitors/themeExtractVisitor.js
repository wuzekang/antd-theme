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

  visitCall(node, visitArgs) {
    if (node.name === 'theme') {
      visitArgs.visitDeeper = false;
      this.callback(node.varName({ inVarCall: true }), node.toCSSCall({ inVarCall: true }));
    }
  }
}

module.exports = ThemeExtractVisitor;
