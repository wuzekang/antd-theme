const less = require('less');
const Variable = require('./variable');

let cnt = 0;

class Muteable extends less.tree.Node {
  constructor(origin, value, index, currentFileInfo) {
    super();
    this.origin = origin;
    this._varName = cnt++;
    this.value = value;
    this._index = index;
    this._fileInfo = currentFileInfo;
    this.typeIndex = 1000;
  }

  varName() {
    const { name } = this;

    if (name instanceof Variable) {
      const camelCaseName = name.name.substr(1).split('-').reduce(
        (acc, val) => `${acc}${acc ? val.replace(/^\S/, (s) => s.toUpperCase()) : val}`,
        ''
      );
      return camelCaseName;
    }

    // const chunk = JSON.stringify(serialize(name));
    // const hashName = sha1(chunk).substr(0, 16);
    // return hashName;
    return this._varName.toString();
  }

  genCSS(context, output) {
    output.add('"[theme:', this.fileInfo(), this.getIndex());
    output.add(this.varName());

    const defaultValue = this.value;
    if (defaultValue) {
      output.add(',default:');
      defaultValue.genCSS(context, output);
    }
    output.add(']"');
  }

  eval() {
    return new Muteable(this.origin, this.value, this._index, this._fileInfo);
  }
}

Muteable.prototype.type = 'Muteable';
module.exports = Muteable;
