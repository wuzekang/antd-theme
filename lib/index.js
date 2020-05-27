"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = __importDefault(require("react"));
var loadThemedStyles_js_1 = require("./loadThemedStyles.js");
var themes_1 = __importDefault(require("./themes"));
var parser_1 = __importDefault(require("./parser"));
var runtime_1 = require("./runtime");
var ThemeContext = react_1.default.createContext(undefined);
var deserialize = function (node) {
    if (typeof node === 'boolean') {
        return node;
    }
    switch (node.type) {
        case 'Call':
            return new runtime_1.tree.Call(node.name, node.args.map(deserialize));
        case 'Negative':
            return new runtime_1.tree.Negative(deserialize(node.value));
        case 'Operation':
            return new runtime_1.tree.Operation(node.op, node.operands.map(deserialize));
        case 'Variable':
            return new runtime_1.tree.Variable(node.name);
        case 'Dimension':
            return new runtime_1.tree.Dimension(node.value, deserialize(node.unit));
        case 'Unit':
            return new runtime_1.tree.Unit(node.numerator, node.denominator, node.backupUnit);
        case 'Value':
            return new runtime_1.tree.Value(node.value.map(deserialize));
        case 'Expression':
            return new runtime_1.tree.Expression(node.value.map(deserialize), node.noSpacing);
        case 'Keyword':
            return new runtime_1.tree.Keyword(node.value);
        case 'Condition':
            return new runtime_1.tree.Condition(node.op, deserialize(node.lvalue), deserialize(node.rvalue), null, node.negate);
        case 'Color':
            return new runtime_1.tree.Color(node.rgb, node.alpha, node.value);
        case 'Url':
            return new runtime_1.tree.URL(node.value);
        case 'Anonymous':
            return new runtime_1.tree.Anonymous(node.value);
        case 'Quoted':
            return new runtime_1.tree.Quoted(node.quote, node.value, node.escaped);
        default:
            throw new Error("unexcepted type " + node.type);
    }
};
var lookup = new Map();
var themes = Object.keys(themes_1.default).map(function (name) {
    var serializedVariables = themes_1.default[name];
    var variables = {};
    Object.keys(serializedVariables).forEach(function (name) {
        var value = serializedVariables[name];
        if (typeof value === 'object') {
            variables[name] = __assign(__assign({}, value), { node: deserialize(value.expr) });
        }
        else {
            variables[name] = value;
        }
    });
    var theme = { name: name, variables: variables };
    lookup.set(theme.name, theme);
    return theme;
});
function parseVariables(variables) {
    if (!variables) {
        return;
    }
    var result = {};
    Object.keys(variables).forEach(function (name) {
        result[name] = new parser_1.default(variables[name]).parse();
    });
    return result;
}
function compute(options) {
    var name = options.name, _variables = options.variables;
    var computed = new Map();
    if (!name) {
        return computed;
    }
    var theme = lookup.get(name);
    if (!theme) {
        return computed;
    }
    var variables = parseVariables(_variables);
    var context = new runtime_1.contexts.Eval({}, [{
            variable: function (name) {
                var _name = name.substr(1);
                if (variables && variables[_name]) {
                    return { value: variables[_name] };
                }
            },
            functionRegistry: runtime_1.functionRegistry,
        }]);
    Object.keys(theme.variables).forEach(function (name) {
        var value = theme.variables[name];
        if (typeof value === 'string') {
            computed.set(name, value);
            return;
        }
        try {
            computed.set(name, value.node.eval(context).toCSS(context));
        }
        catch (err) {
            computed.set(name, value.default);
        }
    });
    return computed;
}
function setTheme(theme) {
    var variables = compute(theme);
    loadThemedStyles_js_1.loadTheme(variables);
    return variables;
}
exports.setTheme = setTheme;
exports.ThemeProvider = function (_a) {
    var theme = _a.theme, onChange = _a.onChange, children = _a.children;
    var running = react_1.default.useRef();
    var pending = react_1.default.useRef();
    react_1.default.useEffect(function () {
        pending.current = function () {
            setTimeout(function () {
                var variables = compute(theme);
                loadThemedStyles_js_1.loadTheme(variables);
                pending.current = undefined;
            }, 0);
        };
        var run = function () {
            if (running.current) {
                return;
            }
            if (!pending.current) {
                return;
            }
            running.current = pending.current;
            pending.current = undefined;
            running.current();
            running.current = undefined;
            run();
        };
        run();
    }, [theme.name, theme.variables]);
    var onChangeRef = react_1.default.useRef(onChange);
    onChangeRef.current = onChange;
    var set = react_1.default.useCallback(function (value) {
        if (onChangeRef.current) {
            onChangeRef.current(value);
        }
    }, []);
    return (react_1.default.createElement(ThemeContext.Provider, { value: [__assign(__assign({}, theme), { themes: themes }), set] }, children));
};
function useTheme() {
    var context = react_1.default.useContext(ThemeContext);
    if (!context) {
        throw new Error('');
    }
    return context;
}
exports.useTheme = useTheme;
