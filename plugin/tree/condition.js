const less = require('less');
const Muteable = require('./muteable');

const { Node } = less.tree;


class Condition extends less.tree.Condition {
  accept(visitor) {
    this.lvalue = visitor.visit(this.lvalue);
    this.rvalue = visitor.visit(this.rvalue);
  }

  _operate(a, b) {
    const { op } = this;
    const result = (() => {
      switch (op) {
      case 'and': return !!(a && b);
      case 'or': return !!(a || b);
      default:
        switch (Node.compare(a, b)) {
        case -1:
          return op === '<' || op === '=<' || op === '<=';
        case 0:
          return op === '=' || op === '>=' || op === '=<' || op === '<=';
        case 1:
          return op === '>' || op === '>=';
        default:
          return false;
        }
      }
    })();

    return this.negate ? !result : result;
  }

  eval(context) {
    const lvalue = this.lvalue instanceof Node ? this.lvalue.eval(context) : this.lvalue;
    const rvalue = this.rvalue instanceof Node ? this.rvalue.eval(context) : this.rvalue;
    const result = this._operate(lvalue, rvalue);
    if ((lvalue instanceof Muteable) || (rvalue instanceof Muteable)) {
      return new Muteable(
        new Condition(
          this.op,
          lvalue instanceof Muteable ? lvalue.origin : lvalue,
          rvalue instanceof Muteable ? rvalue.origin : rvalue,
          this._index,
          this.negate
        ),
        result
      );
    }
    return result;
  }

  genCSS(context, output) {
    output.add('(');

    if (this.negate) {
      output.add('not ');
    }

    if (this.lvalue instanceof Node) {
      this.lvalue.genCSS(context, output);
    }
    else {
      output.add(this.lvalue.toString());
    }

    output.add(` ${this.op} `);

    if (this.rvalue instanceof Node) {
      this.rvalue.genCSS(context, output);
    }
    else {
      output.add(this.rvalue.toString());
    }

    output.add(')');
  }
}

Condition.prototype.type = 'Condition';
module.exports = Condition;
