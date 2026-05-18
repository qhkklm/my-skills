# RSSHub Route 复核清单

## 输出目标

这个 skill 的产物是“可继续完善的 route 草稿”，不是最终可直接合并的完整实现。

因此复核时要优先看结构是否正确、方向是否正确、风险是否说清，而不是强求一次性覆盖全部边角情况。

## 必查规则

### Route 元信息

- `example` 必须是 RSSHub 路径，例如 `/<namespace>/<path>`
- `name` 不要重复 namespace 名称
- `radar[].source` 使用不带协议的相对来源
- `radar[].target` 必须与 route path 一致
- `namespace.ts` 的 `url` 不能带 `https://`
- `categories` 只给一个值
- 不新增 `README.md` 或 `radar.ts`
- 不改 `lib/router.js`

### 抓取策略

- 优先 API，不优先 HTML 抓取
- 有详情页循环时默认给出 `cache.tryGet`
- 不实现翻页参数
- 不添加自定义 query 参数
- 如果没有日期，不要伪造 `new Date()`
- `link` 必须是用户可读页面，不是 API 地址

### 内容映射

- `description` 只放正文
- 标签放 `category`
- 日期优先走 `parseDate`
- `guid` 与 `link` 需要稳定且唯一
- 不手工裁剪标题

### Puppeteer

- 只有确认必须执行前端渲染时，才把 `requirePuppeteer` 设为 `true`
- 不用固定延时，优先等待选择器

## 草稿允许保留的待确认项

下面这些信息允许以“待人工确认项”形式输出，不需要脚本臆造：

- `maintainers`
- 更准确的 `categories`
- 更合适的 route path 命名
- 是否拆出局部 `utils.ts`
- 是否真的需要 Puppeteer

## 推荐输出顺序

1. 推荐提取策略
2. namespace 草稿
3. route 草稿
4. 风险列表
5. 待人工确认项
