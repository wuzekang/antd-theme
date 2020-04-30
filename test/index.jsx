import { Button, Select } from 'antd';
import React from 'react';
import ReactDOM from 'react-dom';
import { ThemeProvider, useTheme } from '../lib';

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
