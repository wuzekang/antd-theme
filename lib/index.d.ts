import React from 'react';
interface ThemeState {
    name?: string;
}
declare type ThemeAction = (state: ThemeState) => void;
interface ThemeProviderProps {
    theme: ThemeState;
    onChange?: (value: ThemeState) => void;
}
export declare const ThemeProvider: React.FC<ThemeProviderProps>;
interface Theme {
    name: string;
    variables: Record<string, string>;
}
export declare function useTheme(): [ThemeState & {
    themes: Theme[];
}, ThemeAction];
export {};
