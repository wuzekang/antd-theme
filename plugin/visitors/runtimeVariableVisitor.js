const less = require('less');

class RuntimeVariableVisitor {
  constructor(runtimeVariableNames, variables) {
    this._visitor = new less.visitors.Visitor(this);
    this.isReplacing = false;
    this.visited = false;
    this.lookup = new Set();
    this.variables = variables;
    runtimeVariableNames.forEach(
      (name) => this.lookup.add(name)
    );
  }

  run(root) {
    return this._visitor.visit(root);
  }

  include(root, name) {
    if (name && this.lookup.has(name)) {
      return true;
    }
    this.visited = false;
    this.run(root);
    if (this.visited && name) {
      this.lookup.add(name);
    }
    return this.visited;
  }

  visitVariable(node) {
    const name = node.name.substr(1);
    this.visited = this.include(this.variables[name].expr, name);
    return node;
  }

  visitCall(node) {
    if (!node.var) {
      return node;
    }

    const name = node.args[0];
    if (!(name instanceof less.tree.Keyword)) {
      return node;
    }

    const variableName = name.value.substr(2);
    this.visited = this.include(this.variables[variableName], variableName);
    return node;
  }
}

module.exports = RuntimeVariableVisitor;
