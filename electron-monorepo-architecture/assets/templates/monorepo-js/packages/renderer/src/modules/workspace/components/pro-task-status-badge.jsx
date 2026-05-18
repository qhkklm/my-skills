import React from 'react';
import { Tag } from '@douyinfe/semi-ui';

// 业务域局部组件也沿用 pro- 前缀，便于统一识别。
export function ProTaskStatusBadge({ status }) {
  const color = status === 'idle' ? 'grey' : 'green';
  const label = status === 'idle' ? '待处理' : '运行中';
  return <Tag color={color}>{label}</Tag>;
}
