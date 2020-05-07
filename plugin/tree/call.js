const less = require('less');
const RuntimeError = require('../runtimeError');
const Muteable = require('./muteable');

const { Node, Anonymous } = less.tree;
const FunctionCaller = less.functions.functionCaller;


//
// A function call node.
//
class Call extends less.tree.Call {
  constructor(name, args, index, currentFileInfo) {
    super();

    this.name = name;
    this.args = args;
    this.calc = name === 'calc';
    this.var = name === 'theme';
    this._index = index;
    this._fileInfo = currentFileInfo;
  }

  accept(visitor) {
    if (this.args) {
      this.args = visitor.visitArray(this.args);
    }
  }

  //
  // When evaluating a function call,
  // we either find the function in the functionRegistry,
  // in which case we call it, passing the  evaluated arguments,
  // if this returns null or we cannot find the function, we
  // simply print it out as it appeared originally [2].
  //
  // The reason why we evaluate the arguments, is in the case where
  // we try to pass a variable to a function, like: `saturate(@color)`.
  // The function should receive the value, not the variable.
  //
  eval(context) {
    /**
     * Turn off math for calc(), and switch back on for evaluating nested functions
     */
    const currentVarContext = context.inVarCall;
    context.inVarCall = this.var || context.inVarCall;

    const currentMathContext = context.mathOn;
    context.mathOn = !this.calc;

    if (this.calc || context.inCalc) {
      context.enterCalc();
    }

    const args = this.args.map((a) => (a instanceof Node ? a.eval(context) : a));

    if (this.calc || context.inCalc) {
      context.exitCalc();
    }

    context.mathOn = currentMathContext;
    context.inVarCall = currentVarContext;

    let result;
    const funcCaller = new FunctionCaller(this.name, context, this.getIndex(), this.fileInfo());

    if (funcCaller.isValid()) {
      try {
        const { func } = funcCaller;
        funcCaller.func = (...args) => {
          if (
            this.name !== '_SELF'
            && args.some((arg) => (arg instanceof Muteable))
          ) {
            const defaultValue = func(
              ...args.map(
                (arg) => {
                  if (arg instanceof Muteable) {
                    return arg.value;
                  }
                  return arg;
                }
              )
            );

            return new Muteable(
              new Call(
                this.name,
                args.map(
                  (arg) => {
                    if (arg instanceof Muteable) {
                      return arg.origin;
                    }
                    return arg;
                  }
                )
              ),
              defaultValue,
              this.getIndex(),
              this.fileInfo()
            );
          }
          return func(...args);
        };
        result = funcCaller.call(args);
      }
      catch (e) {
        throw new RuntimeError({
          type: e.type || 'Runtime',
          message: `error evaluating function \`${this.name}\`${e.message ? `: ${e.message}` : ''}`,
          index: this.getIndex(),
          filename: this.fileInfo().filename,
          line: e.lineNumber,
          column: e.columnNumber,
        });
      }

      if (result !== null && result !== undefined) {
        // Results that that are not nodes are cast as Anonymous nodes
        // Falsy values or booleans are returned as empty nodes
        if (!(result instanceof Node)) {
          if (!result || result === true) {
            result = new Anonymous(null);
          }
          else {
            result = new Anonymous(result.toString());
          }
        }
        result._index = this._index;
        result._fileInfo = this._fileInfo;
        return result;
      }
    }

    return new Call(this.name, args, this.getIndex(), this.fileInfo());
  }

  compare(other) {
    if (!this.var) {
      return;
    }
    return Node.compare(this.defaultValue(), other);
  }
}

Call.prototype.type = 'Call';
module.exports = Call;
