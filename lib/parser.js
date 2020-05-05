"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable max-classes-per-file */
var runtime_1 = require("./runtime");
var whitespaceRegexp = /^\s+/;
var dimensionRegexp = /^([+-]?\d*\.?\d+)(%|[a-z_]+)?/;
var colorKeywordRegexp = /^[_A-Za-z-][_A-Za-z0-9-]+/;
var callNameRegexp = /^([\w-]+|%|progid:[\w.]+)\(/;
var colorRegexp = /^#([A-Fa-f0-9]{8}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{3,4})([\w.#[])?/;
var anonymousRegexp = /^([^.#@\$+\/'"*`(;{}-]*)/;
var keywordRegexp = /^\[?(?:[\w-]|\\(?:[A-Fa-f0-9]{1,6} ?|[^A-Fa-f0-9]))+\]?/;
var Input = /** @class */ (function () {
    function Input(input) {
        this.input = input;
        this.pos = 0;
        this.stack = [];
    }
    Input.prototype.match = function (regexp) {
        var matched = regexp.exec(this.input.slice(this.pos));
        if (matched) {
            this.pos += matched[0].length;
        }
        return matched;
    };
    Input.prototype.save = function () {
        this.stack.push(this.pos);
    };
    Input.prototype.restore = function () {
        if (this.stack.length > 0) {
            this.pos = this.stack.pop();
        }
    };
    Input.prototype.string = function (s) {
        if (this.input.substr(this.pos, s.length) === s) {
            this.pos += s.length;
            return s;
        }
        return null;
    };
    Input.prototype.skipWhitespace = function () {
        this.match(whitespaceRegexp);
    };
    Input.prototype.end = function () {
        return this.input.length === this.pos;
    };
    return Input;
}());
var Parser = /** @class */ (function () {
    function Parser(input) {
        this.input = new Input(input);
    }
    Parser.prototype.parse = function () {
        this.input.skipWhitespace();
        var result = this.dimension() || this.color() || this.colorKeyword() || this.call() || this.anonymous();
        this.input.skipWhitespace();
        if (this.input.end()) {
            return result;
        }
    };
    //
    // A Dimension, that is, a number and a unit
    //
    //     0.5em 95%
    //
    Parser.prototype.dimension = function () {
        var value = this.input.match(dimensionRegexp);
        if (value) {
            return new runtime_1.tree.Dimension(value[1], value[2]);
        }
    };
    //
    // A Keyword color
    //
    //     red blue green
    //
    Parser.prototype.colorKeyword = function () {
        this.input.save();
        var matched = this.input.match(colorKeywordRegexp);
        if (!matched) {
            return;
        }
        var color = runtime_1.tree.Color.fromKeyword(matched[0]);
        if (color) {
            return color;
        }
        this.input.restore();
    };
    //
    // A function call
    //
    //     rgb(255, 0, 255)
    //
    // The arguments are parsed with the `entities.arguments` parser.
    //
    Parser.prototype.call = function () {
        var name = this.input.match(callNameRegexp);
        if (!name) {
            return;
        }
        this.input.skipWhitespace();
        var args = [];
        var arg;
        // eslint-disable-next-line no-cond-assign
        while (arg = this.dimension()) {
            args.push(arg);
            this.input.skipWhitespace();
        }
        if (!this.input.string(')')) {
            return;
        }
        return new runtime_1.tree.Call(name, args);
    };
    //
    // A Hexadecimal color
    //
    //     #4F3C2F
    //
    // `rgb` and `hsl` colors are parsed through the `call` parser.
    //
    Parser.prototype.color = function () {
        var rgb = this.input.match(colorRegexp);
        if (rgb && !rgb[2]) {
            return new runtime_1.tree.Color(rgb[1], undefined, rgb[0]);
        }
    };
    Parser.prototype.anonymous = function () {
        var matched = this.input.match(anonymousRegexp);
        if (matched) {
            return new runtime_1.tree.Anonymous(matched[0]);
        }
    };
    Parser.prototype.keyword = function () {
        var k = this.input.match(keywordRegexp);
        if (k) {
            return new runtime_1.tree.Keyword(k[0]);
        }
    };
    return Parser;
}());
exports.default = Parser;
