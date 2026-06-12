# floating-particles

Canvas 粉色可爱粒子背景组件，用于首页温馨治愈氛围。

## 目录结构

```text
components/floating-particles/
  floating-particles.js
  floating-particles.json
  floating-particles.wxml
  floating-particles.wxss
  README.md
```

## 首页使用

`pages/index/index.json`

```json
{
  "usingComponents": {
    "floating-particles": "/components/floating-particles/floating-particles"
  }
}
```

`pages/index/index.wxml`

```xml
<floating-particles
  enabled="{{particlesEnabled}}"
  count="{{particleOptions.count}}"
  density="{{particleOptions.density}}"
  opacity="{{particleOptions.opacity}}"
/>
```

## 参数

- `enabled`: 是否开启动画，默认 `true`
- `count`: 粒子数量，默认 `54`
- `density`: 粒子密度，支持 `low` / `normal` / `high`
- `opacity`: 最大透明度，默认 `0.42`

当前生成范围：

- 数量：`54`，低端机建议 `28 - 36`
- 大小：`8 - 28px`
- 上浮速度：`12 - 42px/s`
- 左右摆动：`8 - 28px`
- 透明度：`0.18 - 0.42`
- 元素：爱心、星星、小猫剪影、圆点

## 开启 / 关闭

在 `pages/index/index.js` 中：

```js
data: {
  particlesEnabled: true,
  particleOptions: {
    count: 54,
    density: 'normal',
    opacity: 0.42
  }
}
```

关闭动画：

```js
this.setData({ particlesEnabled: false });
```

低端机策略：

```js
this.setData({
  particleOptions: {
    count: 32,
    density: 'low',
    opacity: 0.32
  }
});
```

## 性能说明

- 使用 2D Canvas 单层绘制，避免大量 WXML 节点。
- 粒子池固定数量，离开顶部后回收到页面底部，不持续创建 DOM。
- 页面 `hide` 和组件 `detached` 时停止 `requestAnimationFrame`。
- Canvas 层使用 `pointer-events: none`，不阻塞页面滚动、点击和 swiper。
- 粒子颜色半透明，尺寸和速度随机，但总数受控，避免拥挤。
