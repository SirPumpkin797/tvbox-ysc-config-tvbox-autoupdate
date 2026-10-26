# Cloudflare Worker 影视仓固定订阅入口

该 Worker 使用 GitHub Contents API 读取公开仓库 `SirPumpkin797/tvbox-ysc-config-tvbox-autoupdate` 最新的 `main` 文件，不使用 gh-proxy.org 或 Raw main URL。

## 部署

1. 登录 https://dash.cloudflare.com/ → Workers & Pages → Create → Worker。
2. 将 `worker/index.js` 全部复制到编辑器并部署。
3. 你的订阅入口为 `https://<worker名>.<你的子域>.workers.dev/multi`。
4. 在影视仓中重新导入该地址一次。

`/multi` 保持 GitHub 多仓目录顺序与名称，并将本仓库中 `output/<id>.json` 的单仓地址映射为 Worker 的 `/config/<id>`。单仓 JSON 通过 GitHub API 读取，并返回禁止 HTTP 缓存的响应头。这里不需要 GitHub Token（公开仓库）。

## 限制

- **客户端不发出新请求时，Worker 无法主动刷新影视仓本地数据库**。如果影视仓只在导入时获取多仓目录，仍须重新导入或改客户端。
- 未登录 GitHub API 的共享出口配额有限（通常 60 次/小时/IP）。大量请求可能返回 502（上游限流）；可在未来增加有边界的缓存/授权。
- 第三方配置可能包含相对资源路径，本 Worker 不会自动改写内部 spider、JS、wallpaper 等字段；与直接拉取原文件相比，基址改变可能导致这些相对链接失效。必要时在脚本中将这些字段转成绝对地址，或让客户端使用原本仓库 URL。
- 使用前务必确认设备可访问 workers.dev 域名。
