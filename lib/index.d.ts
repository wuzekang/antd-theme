import React from 'react';
declare type ThemeVariables = Record<string, any>;
interface ThemeState {
    name?: string;
    variables?: ThemeVariables;
}
declare type ThemeAction = (state: ThemeState) => void;
interface RuntimeValue {
    theme: any;
    default: string;
}
interface Theme {
    name: string;
    variables: Record<string, string | RuntimeValue>;
}
interface ThemeProviderProps {
    theme: ThemeState;
    onChange?: (value: ThemeState) => void;
}
export declare const ThemeProvider: React.FC<ThemeProviderProps>;
export declare function useTheme(): [ThemeState & {
    themes: Theme[];
}, ThemeAction];
export {};
