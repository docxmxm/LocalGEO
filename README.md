# H3 Heatmap Demo - Sydney

基于 MapLibre GL JS + Deck.gl 的 H3 六边形热力图演示。

## 技术栈

- **底图**: MapLibre GL JS (CARTO Dark Matter 样式)
- **可视化**: Deck.gl H3HexagonLayer + HeatmapLayer
- **前端**: React + Vite
- **后端**: Express + h3-js

## 功能

- **Zoom 0-11**: 热力图模式 (Heatmap)
- **Zoom 12-14**: 聚合六边形 (H3 Res 8)
- **Zoom 15+**: 高精六边形 (H3 Res 10)

## 运行

```bash
npm install
npm run dev
```

- 前端: http://localhost:3000
- API: http://localhost:4000

## API

```
GET /api/heatmap?min_lat=...&max_lat=...&min_lng=...&max_lng=...&zoom=15
```

返回指定区域内的 H3 六边形数据。
