const hueStep = 2;
const saturationStep = 16;
const saturationStep2 = 5;
const brightnessStep1 = 5;
const brightnessStep2 = 15;
const lightColorCount = 5;
const darkColorCount = 4;

function getHue(hsv, i, isLight) {
  let hue;
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
  let saturation;
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

  const processPercent = isPercentage(n);
  n = Math.min(max, Math.max(0, parseFloat(n)));

  // Automatically convert percentage into number
  if (processPercent) {
    n = parseInt(n * max, 10) / 100;
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

  const i = Math.floor(h);
  const f = h - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  const mod = i % 6;
  const r = [v, q, p, p, t, v][mod];
  const g = [t, v, v, q, p, p][mod];
  const b = [p, p, t, v, v, q][mod];

  return { r: r * 255, g: g * 255, b: b * 255 };
}

const paletteTokenRegexp = /~`\s*colorPalette\s*\(\s*'@\{([-\w]+)\}'\s*,\s*(\d+)\s*\)\s*`/g;
const colorTokenRegexp = /(?<![-\w])color\(\s*~`\s*colorPalette\s*\(\s*'@\{([-\w]+)\}'\s*,\s*(\d+)\s*\)\s*`\s*\)/g;

class ColorPalettePlugin {
  constructor() {
    /* Set a minimum Less compatibility string
      * You can also use an array, as in [3, 0] */
    this.minVersion = ['3.0'];
  }

  /* Called immediately after the plugin is
     * first imported, only once. */
  install(less, pluginManager, functions) {
    functions.add(
      'colorPalette',
      (color, dimension) => {
        const index = dimension.value;
        const isLight = index <= 6;
        const hsv = color.toHSV();
        const i = isLight ? lightColorCount + 1 - index : index - lightColorCount - 1;
        const h = getHue(hsv, i, isLight);
        const s = getSaturation(hsv, i, isLight);
        const v = getValue(hsv, i, isLight);
        const rgb = hsvToRgb(h, s, v);
        return new less.tree.Color([rgb.r, rgb.g, rgb.b]);
      }
    );

    const replacement = (_, variable, index) => `colorPalette(@${variable}, ${index})`;

    pluginManager.addPreProcessor(
      {
        process: (str) => str
          .replace(colorTokenRegexp, replacement)
          .replace(paletteTokenRegexp, replacement),
      },
      1
    );
  }

  /* Called for each instance of your @plugin. */
  use() { }

  /* Called for each instance of your @plugin,
     * when rules are being evaluated.
     * It's just later in the evaluation lifecycle */
  eval() { }

  /* Passes an arbitrary string to your plugin
     * e.g. @plugin (args) "file";
     * This string is not parsed for you,
     * so it can contain (almost) anything */
  setOptions() { }

  /* Used for lessc only, to explain
     * options in a Terminal */
  printUsage() { }
}

module.exports = ColorPalettePlugin;
