import React from 'react';
import { Card, List } from '@douyinfe/semi-ui';
import { ProTaskStatusBadge } from '../../components/pro-task-status-badge.jsx';
import { useTaskStore } from '../../store/task-store.js';

// 页面入口采用目录化 index 命名，页面级编排尽量保持简洁。
export function TaskCenterPage() {
  const { taskList } = useTaskStore();

  return (
    <Card title="任务">
      <List
        dataSource={taskList}
        renderItem={(item) => (
          <List.Item
            main={
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <span>{item.name}</span>
                <ProTaskStatusBadge status={item.status} />
              </div>
            }
          />
        )}
      />
    </Card>
  );
}
