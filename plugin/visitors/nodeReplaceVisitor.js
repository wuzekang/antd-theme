const less = require('less');

const Call = require('../tree/call');
const Negative = require('../tree/negative');
const Variable = require('../tree/variable');
const Muteable = require('../tree/muteable');
const Operation = require('../tree/operation');
const Condition = require('../tree/condition');

class NodeReplaceVisitor {
  constructor(variables) {
    this._variables = variables;
    this._visitor = new less.visitors.Visitor(this);
    this.isReplacing = true;
    this.isPreEvalVisitor = true;
  }

  run(root) {
    return this._visitor.visit(root);
  }

  visitCondition(node) {
    return new Condition(node.op, node.lvalue, node.rvalue, node._index, node.negate);
  }

  visitNegative(node) {
    return new Negative(node.value);
  }

  visitRuleset(node) {
    if (node.root) {
      node.rules = node.rules.map(
        (rule) => {
          if (rule instanceof less.tree.Declaration) {
            const name = rule.name.substr(1);
            if (this._variables && this._variables.has(name)) {
              rule.value = new Muteable(
                new Variable(rule.name, rule.getIndex(), rule.fileInfo()),
                this._variables.get(name),
                rule.getIndex(),
                rule.fileInfo()
              );
            }
          }
          return rule;
        }
      );
    }
    return node;
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
