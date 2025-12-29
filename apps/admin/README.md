# 937 CMS Console (Admin)

技术栈：Vue 3 + Naive UI + Vite

## 开发

1) 启动 API（默认 `http://127.0.0.1:3000`）

`cd ../api && npm run start:dev`

2) 启动 Console

`npm run dev`

访问：`http://127.0.0.1:5173/console/`

## 打包

`npm run build`

产物输出到 `dist/`，后端 API 会自动把该目录挂载到 `GET /console/`。

