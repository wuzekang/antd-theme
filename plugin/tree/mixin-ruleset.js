const less = require('less');

const { Ruleset } = less.tree;

class MixinRuleset extends Ruleset {
  constructor(selectors, rules, strictImports, frames, visibilityInfo) {
    super(selectors, rules, strictImports, visibilityInfo);
    this.frames = frames;
  }

  eval(context) {
    if (this.frames) {
      context.frames.unshift(...this.frames);
    }

    const ruleset = super.eval(context);

    if (this.frames) {
      context.frames.splice(0, this.frames.length);
    }

    return ruleset;
  }
}

Ruleset.prototype.type = 'Ruleset';
Ruleset.prototype.isRuleset = true;
module.exports = MixinRuleset;
