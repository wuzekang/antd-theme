const less = require('less');
const Variable = require('./variable');
const serialize = require('../serialize');
const sha1 = require('../sha1');

class Muteable extends less.tree.Node {
  constructor(origin, value, index, currentFileInfo) {
    super();
    this.origin = origin;
    this.value = value;
    this._index = index;
    this._fileInfo = currentFileInfo;
    this.typeIndex = 1000;
  }

  varName() {
    const { origin } = this;

    if (origin instanceof Variable) {
      const camelCaseName = origin.name.substr(1).split('-').reduce(
        (acc, val) => `${acc}${acc ? val.replace(/^\S/, (s) => s.toUpperCase()) : val}`,
        ''
      );
      return camelCaseName;
    }

    const chunk = JSON.stringify(serialize(origin));
    const hashName = sha1(chunk).substr(0, 16);
    return hashName;
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
