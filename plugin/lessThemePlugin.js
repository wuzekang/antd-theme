const NodeReplaceVisitor = require('./visitors/nodeReplaceVisitor');
const ThemeExtractVisitor = require('./visitors/themeExtractVisitor');

class LessVariablesExtractPlugin {
  constructor(listener) {
    /* Set a minimum Less compatibility string
    * You can also use an array, as in [3, 0] */
    this.minVersion = ['3.0'];
    this.listener = listener;
  }

  /* Called immediately after the plugin is
   * first imported, only once. */
  install(less, pluginManager) {
    pluginManager.addVisitor(new NodeReplaceVisitor());
    pluginManager.addVisitor(new ThemeExtractVisitor(this.listener));
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

module.exports = LessVariablesExtractPlugin;
