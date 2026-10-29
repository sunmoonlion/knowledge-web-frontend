import { defineDestinations } from '@/lib/cross-app/links'

// knowbase 会把用户带去的页面，都登记在这里（PRD/apps/README.md 4.1）。
// knowbase web端（SDD 0044）现在只接别的应用带来的人（直达上传、knowmart 交易记录的链接），
// 还不带人去别处。
export const destinations = defineDestinations({})

export type DestinationKey = keyof typeof destinations
