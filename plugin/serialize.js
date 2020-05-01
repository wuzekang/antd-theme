const less = require('less');

function serialize(node) {
  if (node instanceof less.tree.Call) {
    return {
      type: node.type,
      name: node.name,
      args: node.args.map((arg) => serialize(arg)),
    };
  }

  if (node instanceof less.tree.Negative) {
    return {
      type: node.type,
      value: serialize(node.value),
    };
  }

  if (node instanceof less.tree.Operation) {
    return {
      type: node.type,
      op: node.op,
      operands: node.operands.map(serialize),
    };
  }

  if (node instanceof less.tree.Variable) {
    return {
      type: node.type,
      name: node.name.substr(1),
    };
  }

  if (node instanceof less.tree.Dimension) {
    return {
      type: node.type,
      value: node.value,
      unit: serialize(node.unit),
    };
  }

  if (node instanceof less.tree.Unit) {
    return {
      type: node.type,
      numerator: node.numerator,
      denominator: node.denominator,
      backupUnit: node.backupUnit,
    };
  }

  if (node instanceof less.tree.Value) {
    return {
      type: node.type,
      value: node.value.map(serialize),
    };
  }

  if (node instanceof less.tree.Expression) {
    return {
      type: node.type,
      value: node.value.mapp(serialize),
      noSpacing: node.noSpacing,
    };
  }

  throw new Error(node.type);
}

module.exports = serialize;
