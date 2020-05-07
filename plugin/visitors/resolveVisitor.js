const less = require('less');
const Muteable = require('../tree/muteable');
const colorPalette = require('../../lib/colorPalette');
const ReductionVisitor = require('./reductionVisitor');

const reductionVisitor = new ReductionVisitor();

class ResolveVisitor {
  constructor(runtimeVariableNames, variables) {
    this._visitor = new less.visitors.Visitor(this);
    this.isReplacing = true;
    this.lookup = new Set();
    this.variables = variables;
    runtimeVariableNames.forEach(
      (name) => this.lookup.add(name)
    );

    const frame = new less.tree.Ruleset(
      null,
      Object.keys(variables).map(
        (name) => new less.tree.Declaration(
          `@${name}`, this.variables[name].node
        )
      )
    );
    frame.functionRegistry = less.functions.functionRegistry.inherit();
    frame.functionRegistry.add(
      'colorPalette', (color, index) => new less.tree.Color(colorPalette(color, index))
    );

    const context = new less.contexts.Eval({ math: 0 }, [frame]);

    this._context = context;
  }

  run(root) {
    const context = this._context;
    const value = this._visitor
      .visit(new less.tree.Value([root]))
      .eval(this._context);

    if (value instanceof Muteable) {
      return {
        runtime: true,
        expr: reductionVisitor.run(
          value.origin
        ),
        node: value.value,
        value: value.value.toCSS(context),
      };
    }

    return {
      runtime: false,
      expr: null,
      node: value,
      value: value.toCSS(context),
    };
  }

  visit(root) {
    const fn = this[`visit${root.type}`];
    return fn ? fn.call(this, root) : root;
  }

  visitValue(node) {
    if (node.value.length === 1) {
      return this.visit(node.value[0]);
    }
    return node;
  }

  visitVariable(node) {
    const name = node.name.substr(1);
    if (this.lookup.has(name)) {
      return new Muteable(
        node,
        this.variables[name].node,
        node._index,
        node._fileInfo
      );
    }
    return this.visit(this.variables[name].expr);
  }

  visitMuteable(node) {
    return this.visit(node.origin);
  }
}

module.exports = ResolveVisitor;
