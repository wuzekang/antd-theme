/* eslint-disable max-classes-per-file */
import { tree } from './runtime';

const whitespaceRegexp = /^\s+/;
const dimensionRegexp = /^([+-]?\d*\.?\d+)(%|[a-z_]+)?/;
const colorKeywordRegexp = /^[_A-Za-z-][_A-Za-z0-9-]+/;
const callNameRegexp = /^([\w-]+|%|progid:[\w.]+)\(/;
const colorRegexp = /^#([A-Fa-f0-9]{8}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{3,4})([\w.#[])?/;
const anonymousRegexp = /^([^.#@\$+\/'"*`(;{}-]*)/;
const keywordRegexp = /^\[?(?:[\w-]|\\(?:[A-Fa-f0-9]{1,6} ?|[^A-Fa-f0-9]))+\]?/;

class Input {
  private pos: number = 0;

  private stack: number[] = [];

  constructor(readonly input: string) {}

  match(regexp: RegExp) {
    const matched = regexp.exec(this.input.slice(this.pos));
    if (matched) {
      this.pos += matched[0].length;
    }
    return matched;
  }

  save() {
    this.stack.push(this.pos);
  }

  restore() {
    if (this.stack.length > 0) {
      this.pos = this.stack.pop() as number;
    }
  }

  string(s: string) {
    if (this.input.substr(this.pos, s.length) === s) {
      this.pos += s.length;
      return s;
    }
    return null;
  }

  skipWhitespace() {
    this.match(whitespaceRegexp);
  }

  end() {
    return this.input.length === this.pos;
  }
}


class Parser {
  private input: Input;

  constructor(input: string) {
    this.input = new Input(input);
  }

  parse() {
    this.input.skipWhitespace();
    const result = this.dimension() || this.color() || this.colorKeyword() || this.call() || this.anonymous();
    this.input.skipWhitespace();
    if (this.input.end()) {
      return result;
    }
  }

  //
  // A Dimension, that is, a number and a unit
  //
  //     0.5em 95%
  //
  dimension() {
    const value = this.input.match(dimensionRegexp);
    if (value) {
      return new tree.Dimension(value[1], value[2]);
    }
  }

  //
  // A Keyword color
  //
  //     red blue green
  //
  colorKeyword() {
    this.input.save();
    const matched = this.input.match(colorKeywordRegexp);
    if (!matched) {
      return;
    }
    const color = tree.Color.fromKeyword(matched[0]);
    if (color) {
      return color;
    }
    this.input.restore();
  }

  //
  // A function call
  //
  //     rgb(255, 0, 255)
  //
  // The arguments are parsed with the `entities.arguments` parser.
  //
  call() {
    const name = this.input.match(callNameRegexp);
    if (!name) {
      return;
    }
    this.input.skipWhitespace();

    const args: any[] = [];
    let arg: any;

    // eslint-disable-next-line no-cond-assign
    while (arg = this.dimension()) {
      args.push(arg);
      this.input.skipWhitespace();
    }

    if (!this.input.string(')')) {
      return;
    }

    return new tree.Call(name, args);
  }

  //
  // A Hexadecimal color
  //
  //     #4F3C2F
  //
  // `rgb` and `hsl` colors are parsed through the `call` parser.
  //
  color() {
    const rgb = this.input.match(colorRegexp);
    if (rgb && !rgb[2]) {
      return new tree.Color(rgb[1], undefined, rgb[0]);
    }
  }

  anonymous() {
    const matched = this.input.match(anonymousRegexp);
    if (matched) {
      return new tree.Anonymous(matched[0]);
    }
  }

  keyword() {
    const k = this.input.match(keywordRegexp);
    if (k) {
      return new tree.Keyword(k[0]);
    }
  }
}

export default Parser;
