# antd-theme

> Provide runtime dynamic theme for ant design.

## Install

Install with [npm](https://www.npmjs.com/)

```
$ npm install --save antd-theme
```

## Usage

It's recommended to combine `antd-theme/plugin` with the `css-loader`

Then add the loader and the plugin to your webpack config. For example:

webpack.config.js

```js
const AntdThemePlugin = require('antd-theme/plugin');

module.exports = {
  module: {
    rules: [
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

app.js

```tsx
import { Button, Select } from 'antd';
import { ThemeProvider, useTheme } from 'antd-theme';
import React from 'react';
import ReactDOM from 'react-dom';

const ThemeSelect = () => {
  const [{ name, themes }, setTheme] = useTheme();
  return (
    <Select
      style={{ width: 100 }}
      value={name}
      onChange={
        (theme) => setTheme({ name: theme })
      }
    >
      <Select.Option value="">default</Select.Option>
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
  );
};

const App = () => {
  const [theme, setTheme] = React.useState({ name: '' });

  return (
    <ThemeProvider
      theme={theme}
      onChange={(value) => setTheme(value)}
    >
      <ThemeSelect />
      <Button>Button</Button>
    </ThemeProvider>
  );
};

ReactDOM.render(<App />, document.getElementById('root'));
```

## Security considerations

In order for `style` elements to be added to the DOM, a `nonce` attribute may need to be attached to the elements to adhere to a CSP requirements. To provide the value, you can specify the `nonce` value by defining a `CSPSettings` object on the page in global scope:

```js
window.CSPSettings = {
  nonce: 'nonce'
};
```