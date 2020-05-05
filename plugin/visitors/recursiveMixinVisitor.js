const less = require('less');

class RecursiveMixinVisitor {
  constructor(context) {
    this._visitor = new less.visitors.Visitor(this);
    this.isReplacing = false;
    this.isPreEvalVisitor = true;
    this._context = context;
    this.visited = new WeakMap();
    this.needShift = new WeakMap();
    this._root = null;
    this.isRecursive = false;
  }

  run(root) {
    this._root = root;
    return this._visitor.visit(root);
  }

  _findMixinInFrame(call, frame) {
    const result = frame.find(
      call.selector,
      null,
      (rule) => rule.matchArgs(call.arguments, this._context)
    );

    if (result.length > 0) {
      const [{ rule: mixin }] = result;
      return mixin;
    }

    for (let i = 0; i < frame.rules.length; ++i) {
      const rule = frame.rules[i];

      if (rule.type === 'Import' && rule.root) {
        const mixin = this._findMixinInFrame(call, rule.root);
        if (mixin) {
          return mixin;
        }
      }
    }
  }


  _findMixin(call) {
    for (let i = 0; i < this._context.frames.length; ++i) {
      const mixin = this._findMixinInFrame(call, this._context.frames[i]);
      if (mixin) {
        return mixin;
      }
    }
  }

  visitMixinCall(node, visitArgs) {
    const mixin = this._findMixin(node);

    if (!mixin) {
      return node;
    }

    if (mixin === this._root) {
      this.isRecursive = true;
      visitArgs.visitDeeper = false;
      return node;
    }

    const ruleset = new less.tree.Ruleset(
      null,
      mixin.rules
    );

    this.needShift.set(node, true);
    this._context.frames.unshift(ruleset);

    return ruleset;
  }

  visitMixinCallOut(node) {
    if (this.needShift.get(node)) {
      this._context.frames.shift();
    }
  }

  visitRuleset(ruleset) {
    this._context.frames.unshift(ruleset);
    return ruleset;
  }

  visitRulesetOut() {
    this._context.frames.shift();
  }
}

module.exports = RecursiveMixinVisitor;
