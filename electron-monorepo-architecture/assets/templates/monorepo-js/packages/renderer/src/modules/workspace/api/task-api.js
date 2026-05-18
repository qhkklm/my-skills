import { assertPreloadApi } from '@sample-app/shared/contracts/preload-api';

// 页面和 store 不直接散用 window，对桥接能力统一收口。
function getAppBridge() {
  return assertPreloadApi(window.appBridge);
}

export async function listTaskItems() {
  return getAppBridge().task.list();
}

export async function saveTaskItem(payload) {
  return getAppBridge().task.save(payload);
}
