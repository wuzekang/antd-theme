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
      name: node.name,
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
      value: node.value.map(serialize),
      noSpacing: node.noSpacing,
    };
  }

  if (node instanceof less.tree.Color) {
    return {
      type: node.type,
      rgb: node.rgb,
      alpha: node.alpha,
      value: node.value,
    };
  }

  if (node instanceof less.tree.Keyword) {
    return {
      type: node.type,
      value: node.value,
    };
  }

  if (node instanceof less.tree.Quoted) {
    return {
      type: node.type,
      escaped: node.escaped,
      value: node.value,
      quote: node.quote,
    };
  }

  if (node instanceof less.tree.Condition) {
    return {
      type: node.type,
      op: node.op,
      lvalue: serialize(node.lvalue),
      rvalue: serialize(node.rvalue),
      negate: node.negate,
    };
  }

  if (node instanceof less.tree.Anonymous) {
    return {
      type: node.type,
      value: node.value,
    };
  }

  if (node instanceof less.tree.URL) {
    return {
      type: node.type,
      value: serialize(node.value),
    };
  }
  if (node instanceof less.tree.Node && node.type === 'Muteable') {
    return {
      type: node.type,
      origin: serialize(node.origin),
      value: serialize(node.value),
    };
  }

  if (!(node instanceof less.tree.Node)) {
    return node;
  }


  throw new Error(node.type);
}

module.exports = serialize;
