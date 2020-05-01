const colorPalette = require('../lib/colorPalette');

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
      'colorPalette', (color, index) => new less.tree.Color(colorPalette(color, index))
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
