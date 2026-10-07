// 预览的配置：这个应用是谁、用哪几个端口、预览里别的应用在哪。
export const previewConfig = {
  app: 'knowledge',
  port: 3120,
  nextPort: 3121,
  apps: {
    info: 'http://localhost:3110',
    knowledge: 'http://localhost:3120',
    investment: 'http://localhost:3100',
  },
  // 账 56 起用户侧没有页面：不带人去别处，也没有人带到这里
  targets: [],
  sources: {},
  // 刚打开预览时用哪个情景
  defaultScenario: 'signed-in',
}
