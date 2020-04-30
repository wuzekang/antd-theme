class RuntimeError extends Error {
  constructor({
    type, message, index, filename, line, column,
  }) {
    super(message);
    this.type = type || 'Runtime';
    this.index = index;
    this.filename = filename;
    this.line = line;
    this.column = column;
  }
}

module.exports = RuntimeError;
