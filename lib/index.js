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
var load_themed_styles_1 = require("@microsoft/load-themed-styles");
var react_1 = __importDefault(require("react"));
var themes_1 = __importDefault(require("./themes"));
var runtime_1 = require("./runtime");
var ThemeContext = react_1.default.createContext(undefined);
var deserialize = function (node) {
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
        default:
            throw new Error("unexcepted type " + node.type);
    }
};
var lookup = new Map();
var themes = Object.keys(themes_1.default).map(function (name) {
    var variables = themes_1.default[name];
    Object.keys(variables).forEach(function (name) {
        var value = variables[name];
        if (typeof value === 'object') {
            value.theme = deserialize(value.theme);
        }
    });
    var theme = { name: name, variables: variables };
    lookup.set(theme.name, theme);
    return theme;
});
function compute(theme, _variables) {
    var computed = {};
    if (!theme) {
        return computed;
    }
    var context = new runtime_1.contexts.Eval({}, [{
            variable: function (name) {
                if (_variables && _variables[name]) {
                    return new runtime_1.tree.Declaration("@" + name, _variables[name]);
                }
            },
            functionRegistry: runtime_1.functionRegistry,
        }]);
    Object.keys(theme.variables).forEach(function (name) {
        var value = theme.variables[name];
        if (typeof value === 'string') {
            computed[name] = value;
            return;
        }
        try {
            computed[name] = value.theme.eval(context).toCSS(context);
        }
        catch (err) {
            computed[name] = value.default;
        }
    });
    return computed;
}
exports.ThemeProvider = function (_a) {
    var theme = _a.theme, onChange = _a.onChange, children = _a.children;
    react_1.default.useEffect(function () {
        if (theme.name) {
            load_themed_styles_1.loadTheme(compute(lookup.get(theme.name), theme.variables));
        }
        else {
            load_themed_styles_1.loadTheme({});
        }
    }, [theme.name]);
    var onChangeRef = react_1.default.useRef(onChange);
    onChangeRef.current = onChange;
    var setTheme = react_1.default.useCallback(function (value) {
        if (onChangeRef.current) {
            onChangeRef.current(value);
        }
    }, []);
    return (react_1.default.createElement(ThemeContext.Provider, { value: [theme, setTheme] }, children));
};
function useTheme() {
    var context = react_1.default.useContext(ThemeContext);
    if (!context) {
        throw new Error('');
    }
    var state = context[0], set = context[1];
    return [
        __assign(__assign({}, state), { themes: themes }),
        set,
    ];
}
exports.useTheme = useTheme;
