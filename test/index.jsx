import { Button, Select } from 'antd';
import React from 'react';
import ReactDOM from 'react-dom';
import { SketchPicker } from 'react-color';
import { ThemeProvider, useTheme, setTheme } from '../lib/index.tsx';

const initialTheme = { name: 'default', variables: { 'primary-color': '#00ff00' } };

setTheme(initialTheme);

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
