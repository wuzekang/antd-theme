"use strict";
var hueStep = 2;
var saturationStep = 16;
var saturationStep2 = 5;
var brightnessStep1 = 5;
var brightnessStep2 = 15;
var lightColorCount = 5;
var darkColorCount = 4;
function getHue(hsv, i, isLight) {
    var hue;
    if (hsv.h >= 60 && hsv.h <= 240) {
        hue = isLight ? hsv.h - hueStep * i : hsv.h + hueStep * i;
    }
    else {
        hue = isLight ? hsv.h + hueStep * i : hsv.h - hueStep * i;
    }
    if (hue < 0) {
        hue += 360;
    }
    else if (hue >= 360) {
        hue -= 360;
    }
    return Math.round(hue);
}
function getSaturation(hsv, i, isLight) {
    var saturation;
    if (isLight) {
        saturation = Math.round(hsv.s * 100) - saturationStep * i;
    }
    else if (i === darkColorCount) {
        saturation = Math.round(hsv.s * 100) + saturationStep;
    }
    else {
        saturation = Math.round(hsv.s * 100) + saturationStep2 * i;
    }
    if (saturation > 100) {
        saturation = 100;
    }
    if (isLight && i === lightColorCount && saturation > 10) {
        saturation = 10;
    }
    if (saturation < 6) {
        saturation = 6;
    }
    return Math.round(saturation);
}
function getValue(hsv, i, isLight) {
    if (isLight) {
        return Math.round(hsv.v * 100) + brightnessStep1 * i;
    }
    return Math.round(hsv.v * 100) - brightnessStep2 * i;
}
function isOnePointZero(n) {
    return typeof n === 'string' && n.indexOf('.') !== -1 && parseFloat(n) === 1;
}
// Check to see if string passed in is a percentage
function isPercentage(n) {
    return typeof n === 'string' && n.indexOf('%') !== -1;
}
// Take input from [0, n] and return it as [0, 1]
function bound01(n, max) {
    if (isOnePointZero(n)) {
        n = '100%';
    }
    var processPercent = isPercentage(n);
    n = Math.min(max, Math.max(0, parseFloat(n)));
    // Automatically convert percentage into number
    if (processPercent) {
        n = (n * max) / 100;
    }
    // Handle floating point rounding errors
    if ((Math.abs(n - max) < 0.000001)) {
        return 1;
    }
    // Convert into [0, 1] range if it isn't already
    return (n % max) / parseFloat(max);
}
// hsvToRgb
// Converts an HSV color value to RGB.
// *Assumes:* h is contained in [0, 1] or [0, 360] and s and v are contained in [0, 1] or [0, 100]
// *Returns:* { r, g, b } in the set [0, 255]
function hsvToRgb(h, s, v) {
    h = bound01(h, 360) * 6;
    s = bound01(s, 100);
    v = bound01(v, 100);
    var i = Math.floor(h);
    var f = h - i;
    var p = v * (1 - s);
    var q = v * (1 - f * s);
    var t = v * (1 - (1 - f) * s);
    var mod = i % 6;
    var r = [v, q, p, p, t, v][mod];
    var g = [t, v, v, q, p, p][mod];
    var b = [p, p, t, v, v, q][mod];
    return { r: r * 255, g: g * 255, b: b * 255 };
}
function colorPalette(color, dimension) {
    var index = dimension.value;
    var isLight = index <= 6;
    var hsv = color.toHSV();
    var i = isLight ? lightColorCount + 1 - index : index - lightColorCount - 1;
    var h = getHue(hsv, i, isLight);
    var s = getSaturation(hsv, i, isLight);
    var v = getValue(hsv, i, isLight);
    var rgb = hsvToRgb(h, s, v);
    return [rgb.r, rgb.g, rgb.b];
}
module.exports = colorPalette;
