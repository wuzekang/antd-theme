
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
import Keyword from 'less/lib/less/tree/keyword';
import Anonymous from 'less/lib/less/tree/anonymous';
import URL from 'less/lib/less/tree/url';
import Quoted from 'less/lib/less/tree/quoted';
import Condition from 'less/lib/less/tree/condition';

import Expression from 'less/lib/less/tree/expression';
import contexts from 'less/lib/less/contexts';
import functionRegistry from 'less/lib/less/functions/function-registry';
import colorFuncitons from 'less/lib/less/functions/color';
import booleanFunctions from 'less/lib/less/functions/boolean';


import colorPalette from './colorPalette';

functionRegistry.addMultiple(colorFuncitons);
functionRegistry.addMultiple(booleanFunctions);
functionRegistry.add('colorPalette', (color, index) => new Color(colorPalette(color, index)));

const tree = {
  Node,
  Call,
  Condition,
  Negative,
  Operation,
  Variable,
  Dimension,
  Unit,
  Value,
  Expression,
  Color,
  Declaration,
  Keyword,
  Anonymous,
  URL,
  Quoted,
};

export {
  tree,
  contexts,
  functionRegistry
};
