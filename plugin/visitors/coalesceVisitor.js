const less = require('less');
const Muteable = require('../tree/muteable');
const Call = require('../tree/call');

const { Anonymous, Declaration } = less.tree;

class CoalesceVisitor {
  constructor() {
    this._visitor = new less.visitors.Visitor(this);
    this.isReplacing = true;
    this.isPreEvalVisitor = false;
  }

  run(root) {
    return this._visitor.visit(root);
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

  visitRuleset(ruleset) {
    if (!ruleset.rules) {
      return ruleset;
    }

    const grouped = new Map();
    const isOptional = ruleset.rules.map(
      (rule) => {
        if (!(rule instanceof Declaration)) {
          return false;
        }

        if (rule.variable) {
          return false;
        }

        if (!(rule.value instanceof Muteable)) {
          return false;
        }

        const { origin } = rule.value;
        if (!(origin instanceof Call && origin.name === 'if' && origin.args && origin.args.length === 2)) {
          return false;
        }

        const group = grouped.has(rule.name) ? grouped.get(rule.name) : [];
        group.unshift(rule);
        grouped.set(rule.name, group);

        return true;
      }
    );

    const additional = [];
    grouped.forEach((rules, name) => {
      if (!(rules.length > 1)) {
        return;
      }
      const rule = rules[0];

      const declaration = new Declaration(
        name,
        new Muteable(
          new Call('coalesce', rules.map((rule) => rule.value.origin)),
          rules.reduce(
            (acc, rule) => ((acc instanceof Anonymous && !acc.value) ? rule.value.value : acc),
            new Anonymous()
          )
        ),
        rule.important,
        rule.merge,
        rule._index,
        rule._fileInfo,
        rule.inline,
        rule.variable
      );

      declaration.setParent(ruleset);

      additional.push(
        declaration
      );
    });

    const rules = [
      ...ruleset.rules.filter(
        (rule, i) => !(isOptional[i] && grouped.has(rule.name) && grouped.get(rule.name).length > 1)
      ),
      ...additional,
    ];

    if (rules.length === ruleset.rules.length) {
      return ruleset;
    }

    ruleset.rules = rules;
    return ruleset;
  }
}

module.exports = CoalesceVisitor;
