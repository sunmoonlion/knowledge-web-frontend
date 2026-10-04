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
  // knowledge 会带人去 info（申请入库）
  targets: ['info'],
  // investment、info 会把人带到数据目录
  sources: {
    investment: { return_url: 'http://localhost:3100/zh-CN/workbench?ref={ref}' },
    info: { return_url: 'http://localhost:3110/zh-CN/requests' },
  },
  // 刚打开预览时用哪个情景
  defaultScenario: 'default',
}
