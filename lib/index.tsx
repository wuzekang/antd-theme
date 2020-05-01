import { loadTheme, ITheme as ComputedTheme } from '@microsoft/load-themed-styles';
import React from 'react';
import serializedVariableGroups from './themes';
import Parser from './parser';

import {
  tree, contexts, functionRegistry
} from './runtime';

type ThemeVariables = Record<string, any>;

interface Theme {
  name: string;
  variables: Record<string, string | RuntimeValue>;
}

interface ThemeOptions {
  name?: string;
  variables?: ThemeVariables;
}

interface ThemeState extends ThemeOptions {
  name?: string;
  variables?: ThemeVariables;
  themes: Theme[];
  current: Record<string, string>;
}

type ThemeAction = (state: ThemeOptions) => void;

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
  expr: Object,
  default: string,
  node: any,
}

const lookup = new Map<string, Theme>();

const themes: Theme[] = Object.keys(serializedVariableGroups).map(
  (name) => {
    const serializedVariables = serializedVariableGroups[name];
    const variables: Record<string, string | RuntimeValue> = {};
    Object.keys(serializedVariables).forEach(
      (name) => {
        const value = serializedVariables[name];
        if (typeof value === 'object') {
          variables[name] = {
            ...value,
            node: deserialize(value.expr),
          };
        }
        else {
          variables[name] = value;
        }
      }
    );
    const theme = { name, variables };
    lookup.set(theme.name, theme);
    return theme;
  }
);

function parseVariables(variables: Record<string, string> | undefined) {
  if (!variables) {
    return;
  }
  const result = {};
  Object.keys(variables).forEach(
    (name) => {
      result[name] = new Parser(variables[name]).parse();
    }
  );
  return result;
}

function compute(
  theme: Theme | undefined,
  _variables: Record<string, string> | undefined
): ComputedTheme {
  const computed: ComputedTheme = {};
  if (!theme) {
    return computed;
  }
  const variables = parseVariables(_variables);
  const context = new contexts.Eval(
    {}, [{
      variable: (name: string) => {
        const _name = name.substr(1);
        if (variables && variables[_name]) {
          return new tree.Declaration(name, variables[_name]);
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
        computed[name] = value.node.eval(context).toCSS(context);
      }
      catch (err) {
        computed[name] = value.default;
      }
    }
  );
  return computed;
}

export function setTheme(theme: ThemeState) {
  const variables = theme.name ? compute(lookup.get(theme.name), theme.variables) : {};
  loadTheme(variables);
  return variables;
}


interface ThemeProviderProps {
  theme: ThemeOptions,
  onChange?: (value: ThemeOptions) => void;
}
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ theme, onChange, children }) => {
  const variables = React.useMemo(
    () => {
      if (theme.name) {
        return compute(lookup.get(theme.name), theme.variables);
      }
      return {};
    },
    [theme]
  );

  React.useEffect(
    () => {
      loadTheme(variables);
    },
    [variables]
  );

  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;

  const set = React.useCallback(
    (value: ThemeOptions) => {
      if (onChangeRef.current) {
        onChangeRef.current(value);
      }
    },
    []
  );

  const state = React.useMemo(
    () => ({
      ...theme,
      themes,
      current: variables,
    }),
    [theme, variables]
  );

  return (
    <ThemeContext.Provider value={[state, set]}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): [ThemeState, ThemeAction] {
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
