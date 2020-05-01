import { loadTheme, ITheme as ComputedTheme } from '@microsoft/load-themed-styles';
import React from 'react';
import serializedVariables from './themes';
import {
  tree, contexts, functionRegistry
} from './runtime';

type ThemeVariables = Record<string, any>;
interface ThemeState {
  name?: string;
  variables?: ThemeVariables;
}

type ThemeAction = (state: ThemeState) => void;

const ThemeContext = React.createContext<[ThemeState, ThemeAction] | undefined>(undefined);

const deserialize = (node) => {
  switch (node.type) {
  case 'Call':
    return new tree.Call(node.name, node.args.map(deserialize));
  case 'Negative':
    return new tree.Negative(deserialize(node.value));
  case 'Operation':
    return new tree.Operation(node.op, node.operands.map(deserialize));
  case 'Variable':
    return new tree.Variable(node.name);
  case 'Dimension':
    return new tree.Dimension(node.value, deserialize(node.unit));
  case 'Unit':
    return new tree.Unit(node.numerator, node.denominator, node.backupUnit);
  case 'Value':
    return new tree.Value(node.value.map(deserialize));
  case 'Expression':
    return new tree.Expression(node.value.map(deserialize), node.noSpacing);
  default:
    throw new Error(`unexcepted type ${node.type}`);
  }
};

interface RuntimeValue {
  theme: any;
  default: string;
}

interface Theme {
  name: string;
  variables: Record<string, string | RuntimeValue>;
}

const lookup = new Map<string, Theme>();

const themes: Theme[] = Object.keys(serializedVariables).map(
  (name) => {
    const variables = serializedVariables[name];
    Object.keys(variables).forEach(
      (name) => {
        const value = variables[name];
        if (typeof value === 'object') {
          value.theme = deserialize(value.theme);
        }
      }
    );
    const theme = { name, variables };
    lookup.set(theme.name, theme);
    return theme;
  }
);

function compute(
  theme: Theme | undefined,
  _variables: Record<string, any> | undefined
): ComputedTheme {
  const computed: ComputedTheme = {};
  if (!theme) {
    return computed;
  }

  const context = new contexts.Eval(
    {}, [{
      variable: (name: string) => {
        if (_variables && _variables[name]) {
          return new tree.Declaration(`@${name}`, _variables[name]);
        }
      },
      functionRegistry,
    }]
  );

  Object.keys(theme.variables).forEach(
    (name) => {
      const value = theme.variables[name];
      if (typeof value === 'string') {
        computed[name] = value;
        return;
      }

      try {
        computed[name] = value.theme.eval(context).toCSS(context);
      }
      catch (err) {
        computed[name] = value.default;
      }
    }
  );
  return computed;
}

interface ThemeProviderProps {
  theme: ThemeState,
  onChange?: (value: ThemeState) => void;
}
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ theme, onChange, children }) => {
  React.useEffect(
    () => {
      if (theme.name) {
        loadTheme(
          compute(lookup.get(theme.name), theme.variables)
        );
      }
      else {
        loadTheme({});
      }
    },
    [theme.name]
  );

  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;

  const setTheme = React.useCallback(
    (value: ThemeState) => {
      if (onChangeRef.current) {
        onChangeRef.current(value);
      }
    },
    []
  );

  return (
    <ThemeContext.Provider value={[theme, setTheme]}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): [ThemeState & { themes: Theme[] }, ThemeAction] {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error('');
  }
  const [state, set] = context;
  return [
    { ...state, themes },
    set,
  ];
}
