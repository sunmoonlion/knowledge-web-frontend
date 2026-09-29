import { defineDestinations } from '@/lib/cross-app/links'

// knowledge 会把用户带去的页面，都登记在这里（PRD/apps/README.md 4.1）。
export const destinations = defineDestinations({
  // 数据目录里找不到公司时，去 info 申请入库；数据集页上「申请更新」
  'info.request': { target: 'info', segments: ['requests', 'new'], params: ['code'] },
})

export type DestinationKey = keyof typeof destinations
