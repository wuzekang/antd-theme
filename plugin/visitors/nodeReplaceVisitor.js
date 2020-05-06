const less = require('less');

const Call = require('../tree/call');
const Negative = require('../tree/negative');
const Variable = require('../tree/variable');
const Muteable = require('../tree/muteable');
const Operation = require('../tree/operation');
const Condition = require('../tree/condition');

class NodeReplaceVisitor {
  constructor(
    functionRegistry = less.functions.functionRegistry,
    variables = new Map()
  ) {
    this._functionRegistry = functionRegistry;
    this._variables = variables;
    this._visitor = new less.visitors.Visitor(this);
    this.isReplacing = true;
    this.isPreEvalVisitor = true;
    this._context = new less.contexts.Eval();
  }

  run(root) {
    const result = this._visitor.visit(root);
    return result;
  }

  _evalRuleset(ruleset) {
    const context = this._context;

    ruleset.functionRegistry = ((frames) => {
      let i = 0;
      const n = frames.length;
      let found;
      for (; i !== n; ++i) {
        found = frames[i].functionRegistry;
        if (found) {
          return found;
        }
      }
      return this._functionRegistry;
    })(context.frames).inherit();

    // push the current ruleset to the frames stack
    const ctxFrames = context.frames;
    ctxFrames.unshift(ruleset);

    // Evaluate imports
    if (ruleset.root || ruleset.allowImports || !ruleset.strictImports) {
      ruleset.evalImports(context);
    }

    // Store the frames around mixin definitions,
    // so they can be evaluated like closures when the time comes.
    ruleset.rules = ruleset.rules.map(
      (rule) => {
        if (rule.evalFirst) {
          return rule.eval(context);
        }
        return rule;
      }
    );

    return ruleset;
  }

  _cloneRuleset(node) {
    const rules = node.rules ? [...node.rules] : null;

    const ruleset = new less.tree.Ruleset(
      node.selectors ? [...node.selectors] : node.selectors,
      rules,
      node.strictImports,
      node.visibilityInfo()
    );

    ruleset.originalRuleset = node;
    ruleset.root = node.root;
    ruleset.firstRoot = node.firstRoot;
    ruleset.allowImports = node.allowImports;

    if (node.debugInfo) {
      ruleset.debugInfo = node.debugInfo;
    }

    return ruleset;
  }

  visitRuleset(node) {
    const ruleset = node.root ? node : this._cloneRuleset(node);
    this._evalRuleset(ruleset);

    if (ruleset.root) {
      ruleset.rules = ruleset.rules.map(
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

    return ruleset;
  }

  visitRulesetOut() {
    this._context.frames.shift();
  }

  visitCondition(node) {
    return new Condition(node.op, node.lvalue, node.rvalue, node._index, node.negate);
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
