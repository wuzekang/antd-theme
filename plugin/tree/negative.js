const less = require('less');
const Operation = require('./operation');

const { Dimension } = less.tree;

class Negative extends less.tree.Negative {
  genCSS(context, output) {
    output.add('-');
    this.value.genCSS(context, output);
  }

  eval(context) {
    if (context.isMathOn()) {
      return (new Operation('*', [new Dimension(-1), this.value])).eval(context);
    }
    return new Negative(this.value.eval(context));
  }
}

Negative.prototype.type = 'Negative';
module.exports = Negative;
