import {
  Select, Card, Affix, Anchor, Row, Col, Layout, Button
} from 'antd';
import React from 'react';
import ReactDOM from 'react-dom';
import { SketchPicker } from 'react-color';
import { useLocalStorage } from 'react-use';
import { ThemeProvider, useTheme, setTheme } from '../lib/index.tsx';
import Preview from './Preview';
import './index.less';

const { Link } = Anchor;

const storageKey = 'ant-design-theme';

const initialTheme = {
  name: 'default',
  variables: {
    'primary-color': '#1890FF',
  },
};

const initializeTheme = () => {
  const item = localStorage.getItem(storageKey);
  setTheme(item ? JSON.parse(item) : initialTheme);
};

initializeTheme();

const ThemeSelect = () => {
  const [{ name, variables, themes }, setTheme] = useTheme();

  const sketchPicker = React.useMemo(
    () => (
      <SketchPicker
        style={{
          boxShadow: 'none',
        }}
        color={variables['primary-color']}
        onChange={(value) => {
          setTheme({
            name,
            variables: {
              'primary-color': value.hex,
            },
          });
        }}
      />
    ),
    [name, variables]
  );

  const select = React.useMemo(
    () => (
      <Select
        size="small"
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
    [name, variables]
  );

  return (
    <Affix offsetTop={24}>
      <Card
        bodyStyle={{ padding: '0px' }}
        title={select}
        extra={(
          <Button size="small" onClick={() => setTheme(initialTheme)}>
            Reset
          </Button>
        )}
      >
        {sketchPicker}
      </Card>
    </Affix>
  );
};


const componets = [
  'Color',
  'Typography',
  'Button',
  'Radio',
  'Checkbox',
  'Input',
  'Switch',
  'Slider',
  'DatePicker',
  'Rate',
  'Transfer',
  'Table',
  'Tag',
  'Progress',
  'Tree',
  'Pagination',
  'Badge',
  'Alert',
  'Spin',
  'Message',
  'Notification',
  'Tabs',
  'Menu',
  'Tooltip',
  'Popover',
  'Card',
  'Carousel',
  'Collapse',
  'Avatar',
  'Dropdown',
  'Step',
  'Cascader',
  'Select',
  'TreeSelect',
  'TimePicker',
  'Calendar',
  'List',
  'Timeline',
  'Popconfirm',
  'Modal',
  'Form',
];

const content = (
  <Layout style={{ background: 'transparent' }}>
    <Layout.Header />
    <Layout.Content style={{ padding: '40px 32px' }}>
      <Row
        gutter={24}
      >
        <Col xs={4}>
          <Anchor>
            {
              componets.map(
                (name) => <Link href={`#${name}`} title={name} />
              )
            }
          </Anchor>
        </Col>
        <Col xs={16}>
          <div className="theme-edit">
            <Preview />
          </div>
        </Col>
        <Col xs={4}>
          <ThemeSelect />
        </Col>
      </Row>
    </Layout.Content>
  </Layout>
);

const App = () => {
  const [theme, setTheme] = useLocalStorage('ant-design-theme', initialTheme);
  return (
    <ThemeProvider
      theme={theme}
      onChange={(value) => setTheme(value)}
    >
      {content}
    </ThemeProvider>
  );
};

ReactDOM.render(<App />, document.getElementById('root'));
