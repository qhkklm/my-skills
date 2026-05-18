import { useEffect, useState } from 'react';
import { listTaskItems } from '../api/task-api.js';

// 局部 store 留在业务模块内，避免一上来就全局化。
export function useTaskStore() {
  const [taskList, setTaskList] = useState([]);

  useEffect(() => {
    listTaskItems().then(setTaskList);
  }, []);

  return {
    taskList
  };
}
