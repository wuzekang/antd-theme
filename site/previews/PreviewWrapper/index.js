import React from 'react';
import { Card } from 'antd';
import './style.less';

const PreviewWrapper = ({ id, title, children }) => (
  <Card style={{ marginBottom: 24 }} id={id} title={title}>
    {children}
  </Card>
);

export default PreviewWrapper;
