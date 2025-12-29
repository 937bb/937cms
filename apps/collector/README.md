# Go Collector (Worker)

用途：作为独立 Worker，循环从 CMS 拉取采集任务（queue），抓取资源站分页数据，并将每条视频通过 `receive/vod` 入库接口推送到目标站点（可以是本 CMS，也可以是其他站点）。

## 运行方式

默认情况下：由 NestJS 自动拉起执行（发现队列有任务就运行一次），你不需要手动运行。

手动运行（用于调试）从 root 目录：

- 构建：`cd apps/collector && go build -o dist/collector ./cmd/collector`
- 启动（循环跑）：`./dist/collector --api-base http://localhost:3000 --token <COLLECTOR_WORKER_TOKEN>`
- 只跑一轮：`./dist/collector --api-base http://localhost:3000 --token <COLLECTOR_WORKER_TOKEN> --once`

环境变量（可选）：

- `CMS_API_BASE`：等价于 `--api-base`
- `COLLECTOR_WORKER_TOKEN`：等价于 `--token`
- `COLLECTOR_WORKER_ID`：等价于 `--worker-id`

## 说明

- 当前仅支持 MacCMS 常见 `provide` JSON 输出（请求参数 `at=json`）。
- `bb_collect_job.cron` 暂时支持填写数字秒（如 `3600`）或 `@every 3600` 作为“定时采集间隔”。
