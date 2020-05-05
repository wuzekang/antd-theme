
const less = require('less');
const Muteable = require('./muteable');
const RuntimeError = require('../runtimeError');

const MATH = {
  ALWAYS: 0,
  PARENS_DIVISION: 1,
  PARENS: 2,
  STRICT_LEGACY: 3,
};


class Operation extends less.tree.Operation {
  accept(visitor) {
    this.operands = visitor.visitArray(this.operands);
  }

  _operate(context, a, b) {
    const op = this.op === './' ? '/' : this.op;
    if (a instanceof less.tree.Dimension && b instanceof less.tree.Color) {
      a = a.toColor();
    }
    if (b instanceof less.tree.Dimension && a instanceof less.tree.Color) {
      b = b.toColor();
    }
    if (!a.operate) {
      if (a instanceof Operation && a.op === '/' && context.math === MATH.PARENS_DIVISION) {
        return new Operation(this.op, [a, b], this.isSpaced);
      }

      throw new RuntimeError({
        type: 'Operation',
        message: 'Operation on an invalid type',
      });
    }

    return a.operate(context, op, b);
  }

  eval(context) {
    const a = this.operands[0].eval(context);
    const b = this.operands[1].eval(context);

    if (context.isMathOn(this.op)) {
      if ((a instanceof Muteable) || (b instanceof Muteable)) {
        const defaultValue = this._operate(
          context,
          a instanceof Muteable ? a.value : a,
          b instanceof Muteable ? b.value : b
        );

        return new Muteable(
          new Operation(
            this.op,
            [
              a instanceof Muteable ? a.origin : a,
              b instanceof Muteable ? b.origin : b,
            ],
            this.isSpaced
          ),
          defaultValue,
          this.getIndex(),
          this.fileInfo()
        );
      }

      return this._operate(context, a, b);
    }

    return new Operation(this.op, [a, b], this.isSpaced);
  }

  genCSS(context, output) {
    this.operands[0].genCSS(context, output);
    if (this.isSpaced) {
      output.add(' ');
    }
    output.add(this.op);
    if (this.isSpaced) {
      output.add(' ');
    }
    this.operands[1].genCSS(context, output);
  }
}

Operation.prototype.type = 'Operation';
module.exports = Operation;
