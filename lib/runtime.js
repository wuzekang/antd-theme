
import Node from 'less/lib/less/tree/node';
import Call from 'less/lib/less/tree/call';
import Negative from 'less/lib/less/tree/negative';
import Operation from 'less/lib/less/tree/operation';
import Variable from 'less/lib/less/tree/variable';
import Dimension from 'less/lib/less/tree/dimension';
import Unit from 'less/lib/less/tree/unit';
import Value from 'less/lib/less/tree/value';
import Color from 'less/lib/less/tree/color';
import Declaration from 'less/lib/less/tree/declaration';

import Expression from 'less/lib/less/tree/expression';
import contexts from 'less/lib/less/contexts';
import functionRegistry from 'less/lib/less/functions/function-registry';
import functions from 'less/lib/less/functions/color';
import colorPalette from './colorPalette';

functionRegistry.addMultiple(functions);
functionRegistry.add('colorPalette', (color, index) => new Color(colorPalette(color, index)));

const tree = {
  Node,
  Call,
  Negative,
  Operation,
  Variable,
  Dimension,
  Unit,
  Value,
  Expression,
  Color,
  Declaration,
};

export {
  tree,
  functions,
  contexts,
  functionRegistry
};
