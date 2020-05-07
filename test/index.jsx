import {
  Button, Select, TreeSelect, TimePicker, Tree
} from 'antd';
import React from 'react';
import ReactDOM from 'react-dom';
import { SketchPicker } from 'react-color';
import { ThemeProvider, useTheme, setTheme } from '../lib/index.tsx';


const { TreeNode } = TreeSelect;

class TreeSelectDemo extends React.Component {
  state = {
    value: undefined,
  };

  onChange = (value) => {
    this.setState({ value });
  };

  render() {
    return (
      <TreeSelect
        showSearch
        style={{ width: '100%' }}
        value={this.state.value}
        dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
        placeholder="Please select"
        allowClear
        treeDefaultExpandAll
        onChange={this.onChange}
      >
        <TreeNode value="parent 1" title="parent 1">
          <TreeNode value="parent 1-0" title="parent 1-0">
            <TreeNode value="leaf1" title="my leaf" />
            <TreeNode value="leaf2" title="your leaf" />
          </TreeNode>
          <TreeNode value="parent 1-1" title="parent 1-1">
            <TreeNode value="sss" title={<b style={{ color: '#08c' }}>sss</b>} />
          </TreeNode>
        </TreeNode>
      </TreeSelect>
    );
  }
}


const treeData = [
  {
    title: 'parent 1',
    key: '0-0',
    children: [
      {
        title: 'parent 1-0',
        key: '0-0-0',
        disabled: true,
        children: [
          {
            title: 'leaf',
            key: '0-0-0-0',
            disableCheckbox: true,
          },
          {
            title: 'leaf',
            key: '0-0-0-1',
          },
        ],
      },
      {
        title: 'parent 1-1',
        key: '0-0-1',
        children: [{ title: <span style={{ color: '#1890ff' }}>sss</span>, key: '0-0-1-0' }],
      },
    ],
  },
];

const TreeDemo = () => (
  <Tree
    checkable
    defaultExpandedKeys={['0-0-0', '0-0-1']}
    defaultSelectedKeys={['0-0-0', '0-0-1']}
    defaultCheckedKeys={['0-0-0', '0-0-1']}
    treeData={treeData}
  />
);

const initialTheme = { name: 'default', variables: { 'primary-color': '#00ff00', theme: 'default' } };

setTheme(initialTheme);

const ThemeSelect = () => {
  const [{ name, variables, themes }, setTheme] = useTheme();

  const sketchPicker = React.useMemo(
    () => (
      <SketchPicker
        color={variables['primary-color']}
        onChange={(value) => {
          setTheme({ name, variables: { 'primary-color': value.hex, theme: name === 'dark' ? 'dark' : 'default' } });
        }}
      />
    ),
    [variables]
  );

  const select = React.useMemo(
    () => (
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
    ),
    [name]
  );

  return (
    <>
      {select}
      {sketchPicker}
    </>
  );
};

const App = () => {
  const [theme, setTheme] = React.useState(initialTheme);
  const demo = React.useMemo(
    () => (
      <>
        <Button type="primary">Button</Button>
        <Button>Button</Button>
        <Button type="dashed">Button</Button>
        <TreeDemo />
        <TreeSelectDemo />
        <TimePicker />
      </>
    ),
    []
  );

  return (
    <ThemeProvider
      theme={theme}
      onChange={(value) => setTheme(value)}
    >
      <ThemeSelect />
      {demo}
    </ThemeProvider>
  );
};

ReactDOM.render(<App />, document.getElementById('root'));
