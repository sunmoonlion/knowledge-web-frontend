import { defineDestinations } from '@/lib/cross-app/links'

// knowledge 会把用户带去的页面，都登记在这里（PRD/apps/README.md 4.1）。
// 账 56 起用户侧没有页面，也就不带人去别处。
export const destinations = defineDestinations({})

export type DestinationKey = keyof typeof destinations
