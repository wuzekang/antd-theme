import React from 'react';
import { ITheme as ComputedTheme } from './loadThemedStyles.js';
declare type ThemeVariables = Record<string, any>;
interface ThemeOptions {
    name?: string;
    variables?: ThemeVariables;
}
declare type ThemeAction = (state: ThemeOptions) => void;
export declare function setTheme(theme: ThemeOptions): ComputedTheme;
interface ThemeProviderProps {
    theme: ThemeOptions;
    onChange?: (value: ThemeOptions) => void;
}
export declare const ThemeProvider: React.FC<ThemeProviderProps>;
export declare function useTheme(): [ThemeOptions, ThemeAction];
export {};
