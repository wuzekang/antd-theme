const less = require('less');

const RecursiveMixinVisitor = require('./recursiveMixinVisitor');
const Parameter = require('../tree/parameter');
const MixinRuleset = require('../tree/mixin-ruleset');

const { mixin: { Definition: MixinDefinition }, Ruleset } = less.tree;

class MixinExpansionVisitor {
  constructor(functionRegistry) {
    this._functionRegistry = functionRegistry;
    this._visitor = new less.visitors.Visitor(this);
    this.isReplacing = true;
    this.isPreEvalVisitor = true;
    this._unshifted = new WeakSet();
    this._context = new less.contexts.Eval();
  }

  run(root) {
    const result = this._visitor.visit(this._evalRuleset(root));
    return result;
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
  }


  _findMixin(call) {
    for (let i = 0; i < this._context.frames.length; ++i) {
      const mixin = this._findMixinInFrame(call, this._context.frames[i]);
      if (mixin) {
        return mixin;
      }
    }
  }

  _isRecursiveMixin(mixin) {
    const visitor = new RecursiveMixinVisitor(this._context);
    visitor.run(mixin);
    return visitor.isRecursive;
  }

  visitMixinDefinition(node, visitArgs) {
    visitArgs.visitDeeper = false;
    return node;
  }

  _evalMixinCall(node, context) {
    let mixin;
    let mixinPath;
    const args = [];
    let arg;
    let argValue;
    const rules = [];
    let match = false;
    let i;
    let m;
    let f;
    let isRecursive;
    let isOneFound;
    const candidates = [];
    let candidate;
    const conditionResult = [];
    let defaultResult;
    const defFalseEitherCase = -1;
    const defNone = 0;
    const defTrue = 1;
    const defFalse = 2;
    let count;
    let originalRuleset;

    node.selector = node.selector.eval(context);

    function calcDefGroup(mixin, mixinPath) {
      let f;
      let p;
      let namespace;

      for (f = 0; f < 2; f++) {
        conditionResult[f] = true;
        // defaultFunc.value(f);
        for (p = 0; p < mixinPath.length && conditionResult[f]; p++) {
          namespace = mixinPath[p];
          if (namespace.matchCondition) {
            conditionResult[f] = conditionResult[f] && namespace.matchCondition(null, context);
          }
        }
        if (mixin.matchCondition) {
          conditionResult[f] = conditionResult[f] && mixin.matchCondition(args, context);
        }
      }
      if (conditionResult[0] || conditionResult[1]) {
        if (conditionResult[0] !== conditionResult[1]) {
          return conditionResult[1]
            ? defTrue : defFalse;
        }

        return defNone;
      }
      return defFalseEitherCase;
    }

    node.arguments = node.arguments || [];

    for (i = 0; i < node.arguments.length; i++) {
      arg = node.arguments[i];
      argValue = arg.value.eval(context);
      if (arg.expand && Array.isArray(argValue.value)) {
        argValue = argValue.value;
        for (m = 0; m < argValue.length; m++) {
          args.push({ value: argValue[m] });
        }
      }
      else {
        args.push({ name: arg.name, value: argValue });
      }
    }

    const noArgumentsFilter = (rule) => rule.matchArgs(null, context);

    for (i = 0; i < context.frames.length; i++) {
      const mixins = context.frames[i].find(node.selector, null, noArgumentsFilter);
      if (mixins.length > 0) {
        isOneFound = true;

        // To make `default()` function independent of definition order we have two "subpasses" here.
        // At first we evaluate each guard *twice* (with `default() == true` and `default() == false`),
        // and build candidate list with corresponding flags. Then, when we know all possible matches,
        // we make a final decision.

        for (m = 0; m < mixins.length; m++) {
          mixin = mixins[m].rule;
          mixinPath = mixins[m].path;
          isRecursive = false;
          for (f = 0; f < context.frames.length; f++) {
            if (
              (!(mixin instanceof MixinDefinition))
              && mixin === (context.frames[f].originalRuleset || context.frames[f])
            ) {
              isRecursive = true;
              break;
            }
          }
          if (isRecursive) {
            continue;
          }

          if (mixin.matchArgs(args, context)) {
            candidate = { mixin, group: calcDefGroup(mixin, mixinPath) };

            if (candidate.group !== defFalseEitherCase) {
              candidates.push(candidate);
            }

            match = true;
          }
        }

        // defaultFunc.reset();

        count = [0, 0, 0];
        for (m = 0; m < candidates.length; m++) {
          count[candidates[m].group]++;
        }

        if (count[defNone] > 0) {
          defaultResult = defFalse;
        }
        else {
          defaultResult = defTrue;
          if ((count[defTrue] + count[defFalse]) > 1) {
            throw {
              type: 'Runtime',
              message: `Ambiguous use of \`default()\` found when matching for \`${node.format(args)}\``,
              index: node.getIndex(),
              filename: node.fileInfo().filename,
            };
          }
        }

        for (m = 0; m < candidates.length; m++) {
          candidate = candidates[m].group;
          if ((candidate === defNone) || (candidate === defaultResult)) {
            try {
              mixin = candidates[m].mixin;
              if (!(mixin instanceof MixinDefinition)) {
                originalRuleset = mixin.originalRuleset || mixin;
                mixin = new MixinDefinition('', [], mixin.rules, null, false, null, originalRuleset.visibilityInfo());
                mixin.originalRuleset = originalRuleset;
              }

              const newRules = this._expandMixinDefinition(mixin, context, args, node.important);

              // const newRules = mixin.evalCall(context, args, this.important);
              // this._setVisibilityToReplacement(newRules);
              rules.push(newRules);
            }
            catch (e) {
              throw {
                message: e.message,
                index: node.getIndex(),
                filename: node.fileInfo().filename,
                stack: e.stack,
              };
            }
          }
        }

        if (match) {
          return rules;
        }
      }
    }

    if (isOneFound) {
      throw {
        type: 'Runtime',
        message: `No matching definition was found for \`${node.format(args)}\``,
        index: node.getIndex(),
        filename: node.fileInfo().filename,
      };
    }
    else {
      throw {
        type: 'Name',
        message: `${node.selector.toCSS().trim()} is undefined`,
        index: node.getIndex(),
        filename: node.fileInfo().filename,
      };
    }
  }

  _expandMixinDefinition(mixin, context, args, important) {
    const _arguments = [];
    const mixinFrames = mixin.frames ? mixin.frames.concat(context.frames) : context.frames;

    const paramsFrame = mixin.evalParams(context, new less.contexts.Eval(context, mixinFrames), args, _arguments);
    paramsFrame.prependRule(new less.tree.Declaration('@arguments', new less.tree.Expression(_arguments).eval(context)));

    const condition = mixin.condition && mixin.condition.eval(
      new less.contexts.Eval(context, [
        paramsFrame,
        ...(mixin.frames || []),
        ...context.frames,
      ])
    );

    let ruleset = new less.tree.Ruleset(
      [
        new less.tree.Selector(
          [new less.tree.Element(' ', '&')],
          null,
          condition
        ),
      ],
      [...mixin.rules]
    );
    ruleset.originalRuleset = mixin;

    if (important) {
      ruleset = ruleset.makeImportant();
    }

    return new MixinRuleset(
      [
        new less.tree.Selector(
          [new less.tree.Element(' ', '&')]
        ),
      ],
      [
        ...paramsFrame.rules.map(
          (rule) => {
            if (rule instanceof less.tree.Declaration) {
              return new Parameter(
                rule.name,
                rule.value,
                rule.important,
                rule.merge,
                rule._index,
                rule._fileInfo,
                rule.inline,
                rule.variable
              );
            }
            return rule;
          }
        ),
        ruleset,
      ],
      null,
      mixin.frames
    );
  }

  visitMixinCall(node) {
    const context = this._context;

    const mixin = this._findMixin(node);

    if (!mixin) {
      return node;
    }

    if (this._isRecursiveMixin(mixin)) {
      return node;
    }


    const rules = this._evalMixinCall(node, context);
    const frame = new Ruleset(
      [
        new less.tree.Selector(
          [new less.tree.Element(' ', '&')]
        ),
      ],
      rules
    );
    this._unshifted.add(frame);
    this.visitRuleset(frame);
    return frame;
  }

  visitMixinCallOut(node) {
    if (this._unshifted.has(node)) {
      this._unshifted.delete(node);
      this.visitRulesetOut(node);
    }
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
    return this._evalRuleset(ruleset);
  }

  visitRulesetOut() {
    this._context.frames.shift();
  }
}

module.exports = MixinExpansionVisitor;
