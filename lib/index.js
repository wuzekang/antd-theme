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
var ThemeContext = react_1.default.createContext(undefined);
exports.ThemeProvider = function (_a) {
    var theme = _a.theme, onChange = _a.onChange, children = _a.children;
    react_1.default.useEffect(function () {
        if (theme.name) {
            load_themed_styles_1.loadTheme(themes_1.default[theme.name]);
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
var themes = Object.keys(themes_1.default).map(function (name) { return ({ name: name, variables: themes_1.default[name] }); });
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
