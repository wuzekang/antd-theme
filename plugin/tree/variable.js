const less = require('less');
const RuntimeError = require('../runtimeError');

function find(obj, fun) {
  for (let i = 0, r; i < obj.length; i++) {
    r = fun.call(obj, obj[i]);
    if (r) {
      return r;
    }
  }
  return null;
}

class Variable extends less.tree.Variable {
  eval(context) {
    let { name } = this;

    if (name.indexOf('@@') === 0) {
      name = `@${new Variable(name.slice(1), this.getIndex(), this.fileInfo()).eval(context).value}`;
    }

    if (this.evaluating) {
      throw new RuntimeError({
        type: 'Name',
        message: `Recursive variable definition for ${name}`,
        filename: this.fileInfo().filename,
        index: this.getIndex(),
      });
    }

    this.evaluating = true;

    const variable = find(context.frames, (frame) => {
      const v = frame.variable(name);
      if (v) {
        if (v.important) {
          const importantScope = context.importantScope[context.importantScope.length - 1];
          importantScope.important = v.important;
        }
        // If in calc, wrap vars in a function call to cascade evaluate args first
        if (context.inCalc) {
          return (new less.tree.Call('_SELF', [v.value])).eval(context);
        }

        return v.value.eval(context);
      }
    });
    if (variable) {
      this.evaluating = false;
      return variable;
    }

    throw new RuntimeError({
      type: 'Name',
      message: `variable ${name} is undefined`,
      filename: this.fileInfo().filename,
      index: this.getIndex(),
    });
  }

  genCSS(context, output) {
    output.add(this.name);
  }
}

Variable.prototype.type = 'Variable';
module.exports = Variable;
