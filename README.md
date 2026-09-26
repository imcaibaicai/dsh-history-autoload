# dsh-history-autoload

[English](README.en.md) | 简体中文

DSH 浏览器端插件：**进入会话后自动把更早的历史全部加载完**。纯浏览器端 UI，装卸即回到官方默认，不改动任何官方文件。

## 它解决什么

官方进入会话只加载最后一页历史（约 50 条），更早的要手动往上滚。这个插件会自己一页一页往回拉，
直到会话报告"没有更多历史"。

**顺带修好回合过程区的折叠**：官方折叠的前置条件里包含 `!historyIncomplete`，
而它就是分页标志 `hasMore`。历史没加载完时折叠整个不出现（短会话能折叠、长会话不能），
本插件把 `hasMore` 打到 false 之后折叠自然恢复。

## 开关

设置 → 通用 → 「自动加载全部历史」，默认开启。关掉后行为与官方一致。

## 安装

```bash
dsh plugin --profile web add -w dsh-history-autoload
```

手动等价方式：包放到 `<DSH_HOME>/profiles/node_modules/dsh-history-autoload/`，在 `cordis.patch.yml` 加一条：

```yaml
- insert:
    - id: history-autoload
      name: 'dsh-history-autoload'
```

## 卸载

删掉那条 insert 即可（设置项与行为一起消失）。纯浏览器端插件，强刷页面即生效；host 端行随重启组装。

## 实现要点

- 零渲染组件，挂在官方**会话级**插槽 `conversation.session.header.utilities`（每个会话渲染一次）
- 翻页入口用服务面：`ctx.sessions.binding(sessionId).session.loadOlder()`
  （会话级插槽的 props 里**没有** `loadOlder`，必须走服务）
- 上限 200 页；`openState !== "open"` 时最多等待 150 次 × 200ms
- 全部逻辑在 `useEffect` 里、整体 try/catch（对话区有 ErrorBoundary，渲染期抛错会整块降级且不自愈）
- 只依赖官方会话服务面 API（`loadOlder` / `hasMore` / `openState`），**不碰任何 DOM 选择器**，
  对 DSH 升级最稳

## 兼容性

- DeepSeek Harness `0.1.5-rc.1`（web profile，浏览器端）
- 客户端仅 require `react` / `react/jsx-runtime`（平台基线表内）

## License

MIT
