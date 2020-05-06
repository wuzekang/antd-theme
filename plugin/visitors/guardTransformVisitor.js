const less = require('less');
const Call = require('../tree/call');
const Muteable = require('../tree/muteable');
const Condition = require('../tree/condition');
const Parameter = require('../tree/parameter');

class GuardTransformVisitor {
  constructor(functionRegistry) {
    this.isReplacing = true;
    this.isPreEvalVisitor = true;
    this._functionRegistry = functionRegistry;
    this._visitor = new less.visitors.Visitor(this);
    this._context = new less.contexts.Eval();
  }

  run(root) {
    return this._visitor.visit(root);
  }

  visitMixinDefinition(node, visitArgs) {
    visitArgs.visitDeeper = false;
    return node;
  }

  visitRuleset(ruleset) {
    ruleset.functionRegistry = this._functionRegistry;
    this._context.frames.unshift(ruleset);

    const { selectors } = ruleset;
    const selector = selectors && selectors.find(
      ({ condition }) => condition && condition.eval(this._context) instanceof Muteable
    );

    if (selector) {
      return new less.tree.Ruleset(
        ruleset.selectors.map(
          (selector) => new less.tree.Selector(
            selector.elements,
            selector.extendList,
            undefined,
            selector._index,
            selector._fileInfo,
            selector.visibilityInfo()
          )
        ),
        ruleset.rules.map(
          (rule) => {
            if (rule instanceof less.tree.Declaration && !(rule instanceof Parameter)) {
              return new less.tree.Declaration(
                rule.name,
                new Call('if', [selector.condition, rule.value]),
                rule.important,
                rule.merge,
                rule._index,
                rule._fileInfo,
                rule.inline,
                rule.variable
              );
            }
            if (rule instanceof less.tree.Ruleset && !(rule instanceof less.tree.mixin.Definition)) {
              const selectors = [...rule.selectors];
              const last = selectors.pop();
              return new less.tree.Ruleset(
                [
                  ...selectors,
                  new less.tree.Selector(
                    last.elements,
                    last.extendList,
                    last.condition
                      ? new Condition(
                        'and',
                        selector.condition,
                        last.condition,
                        last._index
                      ) : selector.condition,
                    last._index,
                    last._fileInfo,
                    last.visibilityInfo()
                  ),
                ],
                rule.rules,
                rule.strictImports,
                rule.visibilityInfo()
              );
            }
            return rule;
          }
        ),
        ruleset.strictImports,
        ruleset.visibilityInfo()
      );
    }

    return ruleset;
  }

  visitRulesetOut() {
    this._context.frames.shift();
  }
}

module.exports = GuardTransformVisitor;
