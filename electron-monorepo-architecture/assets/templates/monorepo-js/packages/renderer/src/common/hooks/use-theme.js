import { useMemo } from 'react';

// 通用 hooks 放 common，不混入业务状态。
export function useTheme() {
  return useMemo(() => ({
    pageClassName: 'min-h-screen bg-[#f4f6f8] text-[#1f2329]'
  }), []);
}
