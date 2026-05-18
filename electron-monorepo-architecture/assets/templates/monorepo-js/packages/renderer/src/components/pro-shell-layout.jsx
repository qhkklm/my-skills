import React from 'react';
import { Layout, Nav } from '@douyinfe/semi-ui';
import { Outlet } from 'react-router-dom';
import { useTheme } from '../common/hooks/use-theme.js';

// 公共壳层组件使用 pro- 前缀，服务多业务域复用。
export function ProShellLayout() {
  const theme = useTheme();

  return (
    <Layout className={theme.pageClassName}>
      <Layout.Header>
        <Nav
          mode="horizontal"
          header={{ text: '任务中心' }}
          items={[
            { itemKey: 'task-center', text: '任务' }
          ]}
        />
      </Layout.Header>
      <Layout.Content style={{ padding: 16 }}>
        <Outlet />
      </Layout.Content>
    </Layout>
  );
}
