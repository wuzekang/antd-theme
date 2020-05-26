# antd-theme

> Provide runtime dynamic theme for ant design.

## Features

- Quick synchronous theme switching.
- Support real-time modification of color / dimension variables.
- Small packaging size, no need to pack multiple style files.
- Code splitting friendly.

## Install

Install with [npm](https://www.npmjs.com/)

```
$ npm install --save antd-theme
```

## Usage

It's recommended to combine `antd-theme/plugin` with the `css-loader` and `less-loader`

Then add the loader and the plugin to your webpack config. For example:

webpack.config.js

```js
const AntdThemePlugin = require('antd-theme/plugin');

module.exports = {
  module: {
    rules: [
      {
        test: /\.(j|t)sx?$/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              plugins: [
                ['import', {
                  libraryName: 'antd',
                  style: true,
                }],
              ],
              presets: ['react-app'],
            },
          },
        ],
      },
      {
        test: /\.less$/i,
        use: [
          {
            loader: AntdThemePlugin.loader,
          },
          {
            loader: 'css-loader',
          },
          {
            loader: 'less-loader',
            options: {
              javascriptEnabled: true,
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new AntdThemePlugin({
      // Variables declared here can be modified at runtime
      variables: ['primary-color'],
      themes: [
        {
          name: 'dark',
          filename: require.resolve('antd/lib/style/themes/dark.less'),
        },
        {
          name: 'compact',
          filename: require.resolve('antd/lib/style/themes/compact.less'),
        },
      ],
    })
  ],
};
```

app.jsx

```tsx
import { Button, Select } from 'antd';
import { ThemeProvider, useTheme } from 'antd-theme';
import React from 'react';
import ReactDOM from 'react-dom';
import { SketchPicker } from 'react-color';

const initialTheme = {
  name: 'default',
  variables: { 'primary-color': '#00ff00' },
};

const ThemeSelect = () => {
  const [{ name, variables, themes }, setTheme] = useTheme();

  return (
    <>
      <Select
        style={{ width: 100 }}
        value={name}
        onChange={
          (theme) => setTheme({ name: theme, variables })
        }
      >
        {
          themes.map(
            ({ name }) => (
              <Select.Option key={name} value={name}>
                {name}
              </Select.Option>
            )
          )
        }
      </Select>
      <SketchPicker
        color={variables['primary-color']}
        onChange={(value) => {
          // Will update all css attributes affected by primary-color
          setTheme({ name, variables: { 'primary-color': value.hex } });
        }}
      />
    </>
  );
};

const App = () => {
  const [theme, setTheme] = React.useState(initialTheme);
  return (
    <ThemeProvider
      theme={theme}
      onChange={(value) => setTheme(value)}
    >
      <ThemeSelect />
      <Button type="primary">Button</Button>
    </ThemeProvider>
  );
};

ReactDOM.render(<App />, document.getElementById('root'));
```

For those who are using `react-app-rewire-less` and `customize-cra` with react-app-rewired, enable javascript like this

config-overrides.js

```js
const { override, fixBabelImports, addLessLoader, addPostcssPlugins, adjustStyleLoaders, addWebpackPlugin } = require('customize-cra');

const AntdThemePlugin = require('antd-theme/plugin');

module.exports = override(
  fixBabelImports('import', {
    libraryName: 'antd',
    libraryDirectory: 'es',
    style: true,
  }),
  addLessLoader({
    javascriptEnabled: true,
  }),
  adjustStyleLoaders(
    (loaders) => {
      loaders.use[0] = {
        loader: AntdThemePlugin.loader
      }
    }
  ),
  addWebpackPlugin(
    new AntdThemePlugin({
      themes: [
        {
          name: 'dark',
          filename: require.resolve('antd/lib/style/themes/dark.less'),
        },
        {
          name: 'compact',
          filename: require.resolve('antd/lib/style/themes/compact.less'),
        },
      ],
    })
  ),
);
```

## Security considerations

In order for `style` elements to be added to the DOM, a `nonce` attribute may need to be attached to the elements to adhere to a CSP requirements. To provide the value, you can specify the `nonce` value by defining a `CSPSettings` object on the page in global scope:

```js
window.CSPSettings = {
  nonce: 'nonce'
};
```