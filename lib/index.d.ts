import { ITheme as ComputedTheme } from '@microsoft/load-themed-styles';
import React from 'react';
declare type ThemeVariables = Record<string, any>;
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
    computed: Record<string, string>;
}
declare type ThemeAction = (state: ThemeOptions) => void;
interface RuntimeValue {
    expr: Object;
    default: string;
    node: any;
}
export declare function setTheme(theme: ThemeOptions): ComputedTheme;
interface ThemeProviderProps {
    theme: ThemeOptions;
    onChange?: (value: ThemeOptions) => void;
}
export declare const ThemeProvider: React.FC<ThemeProviderProps>;
export declare function useTheme(): [ThemeState, ThemeAction];
export {};
