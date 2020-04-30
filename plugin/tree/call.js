const less = require('less');

const { Node } = less.tree;
const { Anonymous } = less.tree;
const FunctionCaller = less.functions.functionCaller;
const { createHash } = require('crypto');
const RuntimeError = require('../runtimeError');

const encrypt = (algorithm, content) => {
  const hash = createHash(algorithm);
  hash.update(content);
  return hash.digest('hex');
};

const sha1 = (content) => encrypt('sha1', content);

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
    // console.log('call e', this.name);
    const currentVarContext = context.inVarCall;
    context.inVarCall = this.var || context.inVarCall;

    const currentRuntimeContext = context.inRuntimeCall;
    context.inRuntimeCall = this.runtime || context.inRuntimeCall;

    const currentMathContext = context.mathOn;
    context.mathOn = !this.calc;
    if (this.calc || context.inCalc) {
      context.enterCalc();
    }
    const args = context.inRuntimeCall ? this.args : this.args.map((a) => a.eval(context));
    if (this.calc || context.inCalc) {
      context.exitCalc();
    }
    context.mathOn = currentMathContext;

    context.inRuntimeCall = currentRuntimeContext;

    context.inVarCall = currentVarContext;


    let result;
    const funcCaller = new FunctionCaller(this.name, context, this.getIndex(), this.fileInfo());

    if (context.inRuntimeCall) {
      return new Call(this.name, args, this.getIndex(), this.fileInfo());
    }

    if (funcCaller.isValid()) {
      try {
        const { func } = funcCaller;
        funcCaller.func = (...args) => {
          if (this.name !== '_SELF' && args.some((arg) => arg instanceof less.tree.Call && arg.var)) {
            if (context.inVarCall) {
              return new Call(this.name, args, this.getIndex(), this.fileInfo());
            }
            const defaultValue = func(
              ...args.map(
                (arg) => {
                  if (arg instanceof less.tree.Call && arg.var) {
                    return arg.defaultValue();
                  }
                  return arg;
                }
              )
            );

            return new Call(
              'theme',
              [
                new Call(
                  this.name,
                  args
                ),
                defaultValue,
              ],
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

  genCSSCall(context, output) {
    output.add(`${this.name}(`, this.fileInfo(), this.getIndex());

    for (let i = 0; i < this.args.length; ++i) {
      this.args[i].genCSS(context, output);
      if (i + 1 < this.args.length) {
        output.add(', ');
      }
    }

    output.add(')');
  }

  toCSSCall(context) {
    const strs = [];
    this.genCSSCall(context, {
      add(chunk) {
        strs.push(chunk);
      },
      isEmpty() {
        return strs.length === 0;
      },
    });
    return strs.join('');
  }

  varName(context) {
    const name = this.args[0];
    const strs = [];
    context.inVarCall = true;
    name.genCSS(context, {
      add(chunk) {
        strs.push(chunk);
      },
      isEmpty() {
        return strs.length === 0;
      },
    });
    context.inVarCall = false;
    const chunk = strs.join('');
    if (name instanceof less.tree.Keyword) {
      const camelCaseName = chunk.split('-').reduce(
        (acc, val) => `${acc}${acc ? val.replace(/^\S/, (s) => s.toUpperCase()) : val}`,
        ''
      );
      return camelCaseName;
    }
    const hashName = sha1(chunk).substr(0, 16);
    return hashName;
  }

  defaultValue() {
    if (!this.var || this.args.length <= 1) {
      return null;
    }
    if (this.args.length > 2) {
      return new less.tree.Value(this.args.slice(1));
    }
    return this.args[1];
  }

  genCSSVar(context, output) {
    const { inVarCall } = context;
    if (inVarCall) {
      this.genCSSCall(context, output);
      return;
    }

    output.add('"[theme:', this.fileInfo(), this.getIndex());
    output.add(this.varName(context));

    const defaultValue = this.defaultValue();
    if (defaultValue) {
      output.add(',default:');
      defaultValue.genCSS(context, output);
    }
    output.add(']"');
  }

  genCSS(context, output) {
    if (this.var) {
      if (context) {
        this.genCSSVar(context, output);
      }
      else {
        this.defaultValue().genCSS(context, output);
      }
    }
    else {
      this.genCSSCall(context, output);
    }
  }
}

Call.prototype.type = 'Call';
module.exports = Call;
