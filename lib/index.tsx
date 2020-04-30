import { loadTheme } from '@microsoft/load-themed-styles';
import React from 'react';
import variables from './themes';

interface ThemeState {
  name?: string,
}

type ThemeAction = (state: ThemeState) => void;

const ThemeContext = React.createContext<[ThemeState, ThemeAction] | undefined>(undefined);

interface ThemeProviderProps {
  theme: ThemeState,
  onChange?: (value: ThemeState) => void;
}
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ theme, onChange, children }) => {
  React.useEffect(
    () => {
      if (theme.name) {
        loadTheme(variables[theme.name]);
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

interface Theme {
  name: string,
  variables: Record<string, string>
}


const themes: Theme[] = Object.keys(variables).map(
  (name) => ({ name, variables: variables[name] })
);

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
