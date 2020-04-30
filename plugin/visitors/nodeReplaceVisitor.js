const less = require('less');
const Negative = require('../tree/negative');
const Variable = require('../tree/variable');
const Operation = require('../tree/operation');
const Call = require('../tree/call');

class NodeReplaceVisitor {
  constructor() {
    this._visitor = new less.visitors.Visitor(this);
    this.isReplacing = true;
    this.isPreEvalVisitor = true;
    this.deps = new WeakMap();
  }

  run(root) {
    return this._visitor.visit(root);
  }

  visitImport(node) {
    const isExists = () => {
      const exists = new WeakMap();
      const nodes = [node];
      let i = 0;
      while (i < nodes.length) {
        if (exists.get(node)) {
          return true;
        }

        const n = nodes[i];
        ++i;

        if (!this.deps.has(n)) {
          continue;
        }

        this.deps.get(n).forEach(
          (dep) => {
            exists.set(dep, true);
            nodes.push(dep);
          }
        );
      }
      return false;
    };

    if (isExists()) {
      return;
    }

    if (node.root) {
      node.root.rules.filter(
        (rule) => rule instanceof less.tree.Import
      ).forEach(
        (rule) => {
          const dep = this.deps.get(node) || [];
          this.deps.set(node, [...dep, rule]);
        }
      );
    }

    return node;
  }

  visitNegative(node) {
    return new Negative(node.value);
  }

  visitVariable(node) {
    return new Variable(node.name, node._index, node._fileInfo);
  }

  visitOperation(node) {
    return new Operation(node.op, node.operands, node.isSpaced);
  }

  visitCall(node) {
    return new Call(node.name, node.args, node._index, node._fileInfo);
  }
}

module.exports = NodeReplaceVisitor;
