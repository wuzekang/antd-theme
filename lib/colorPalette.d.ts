declare const hueStep = 2;
declare const saturationStep = 16;
declare const saturationStep2 = 5;
declare const brightnessStep1 = 5;
declare const brightnessStep2 = 15;
declare const lightColorCount = 5;
declare const darkColorCount = 4;
declare function getHue(hsv: any, i: any, isLight: any): number;
declare function getSaturation(hsv: any, i: any, isLight: any): number;
declare function getValue(hsv: any, i: any, isLight: any): number;
declare function isOnePointZero(n: any): boolean;
declare function isPercentage(n: any): boolean;
declare function bound01(n: any, max: any): number;
declare function hsvToRgb(h: any, s: any, v: any): {
    r: number;
    g: number;
    b: number;
};
declare function colorPalette(color: any, dimension: any): number[];
