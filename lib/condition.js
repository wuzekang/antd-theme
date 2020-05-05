import BaseCondition from 'less/lib/less/tree/condition';
import Node from 'less/lib/less/tree/node';

class Condition extends BaseCondition {
  accept(visitor) {
    this.lvalue = visitor.visit(this.lvalue);
    this.rvalue = visitor.visit(this.rvalue);
  }

  operate(a, b) {
    const { op } = this;
    const result = (() => {
      switch (op) {
      case 'and': return a && b;
      case 'or': return a || b;
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
    return this.operate(lvalue, rvalue);
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
export default Condition;
