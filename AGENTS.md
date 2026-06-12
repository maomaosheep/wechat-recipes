# AGENTS.md

## 协作者信息

- 用户叫毛毛，是一名初级工程师。
- 和毛毛沟通时请尽量用中文，解释要清楚、耐心，适合初级工程师理解。
- 做代码修改前先读现有结构，优先沿用项目里的写法，不要随意大改架构。

## 项目概览

这是一个微信小程序项目，主题是「菜谱 DIY / 今天吃什么」。

主要功能包括：

- 首页菜谱浏览：按分类查看菜谱，支持搜索、分页加载、收藏、轮播图入口。
- 随机转盘：从全部菜谱或「收藏 / 自制」菜谱里随机抽一道。
- 收藏页：查看已收藏菜谱，并支持取消收藏或删除菜谱。
- 详情页：查看菜谱封面、材料、步骤和收藏状态。
- 自制菜谱：用户可以填写菜谱信息、选择图片并上传保存。
- 管理后台：管理员可以维护菜谱和轮播图。
- 云开发：使用云数据库、云函数和云存储，也保留了本地 mock 兜底服务。

## 技术栈

- 平台：微信小程序
- 小程序基础库：`3.16.1`
- 组件框架：`glass-easel`
- 云开发：微信云开发
- 云函数目录：`cloudfunctions/`
- 主要语言：JavaScript、WXML、WXSS、JSON
- 图片素材：`assets/` 和远程图片 URL

## 重要配置

- 小程序配置：`app.json`
- 微信开发者工具项目配置：`project.config.json`
- 私有项目配置：`project.private.config.json`
- 全局样式：`app.wxss`
- 全局启动逻辑：`app.js`
- 业务配置：`utils/config.js`

`utils/config.js` 里有几个关键项：

- `useCloud: true`：当前默认使用云开发。
- `envId: 'cloud1-d1g647ojy78e6a6d1'`：云环境 ID。
- `adminOpenids`：管理员 openid 白名单。
- `pageSize: 6`：首页分页大小。
- `cacheVersion`、`cacheMaxAge`：本地缓存版本和过期时间。
- `allowMockFallback: false`：云读取失败时默认不回退到 mock 数据。
- `cloudStorageRoot: '自制小程序'`：用户上传图片的云存储根目录。

## 目录结构

```text
D:\自制小程序
├── app.js
├── app.json
├── app.wxss
├── project.config.json
├── project.private.config.json
├── sitemap.json
├── CLOUD_SETUP.md
├── AGENTS.md
├── assets/
│   ├── icons/
│   └── tabbar/
├── components/
│   └── floating-particles/
├── pages/
│   ├── index/
│   ├── wheel/
│   ├── favorites/
│   ├── profile/
│   ├── detail/
│   ├── add/
│   └── admin/
├── utils/
│   ├── api.js
│   ├── cloudService.js
│   ├── mockService.js
│   ├── recipes.js
│   ├── favorite.js
│   └── config.js
├── cloudfunctions/
│   ├── login/
│   └── initData/
└── scripts/
    └── collect-xiachufang-recipes.js
```

## 页面说明

- `pages/index/index`：首页。负责分类、搜索、轮播图、菜谱列表、分页、收藏、管理员入口。
- `pages/wheel/wheel`：随机转盘页。使用 Canvas 绘制转盘，可在全部菜谱和个人菜谱之间切换。
- `pages/favorites/favorites`：收藏页。读取本地收藏 ID，再从全部菜谱中过滤展示。
- `pages/detail/detail`：菜谱详情页。根据 `id` 获取菜谱详情，并支持收藏切换。
- `pages/add/add`：自制菜谱上传页。支持填写标题、描述、时间、材料、步骤和封面图。
- `pages/admin/admin`：管理员后台。根据 `adminOpenids` 判断权限，可编辑菜谱和轮播图。
- `pages/profile/profile`：个人页，目前逻辑较少，`profile.js` 为空页面定义。

## 工具层说明

- `utils/api.js`：业务 API 门面。根据配置选择 `cloudService` 或 `mockService`，并处理缓存清理。
- `utils/cloudService.js`：云开发实现。读写 `recipes`、`diy`、`banners` 集合，处理 openid、初始化数据、删除云文件。
- `utils/mockService.js`：本地 mock 实现。使用 `wx.setStorageSync` 存储菜谱、轮播图和自制菜谱。
- `utils/recipes.js`：内置 mock 菜谱、轮播图和分类数据。
- `utils/favorite.js`：收藏逻辑。收藏 ID 存在本地缓存键 `favoriteRecipes`。
- `utils/config.js`：云环境、分页、缓存、管理员、图片策略等配置。

## 数据模型和集合

云开发里主要使用这些集合：

- `recipes`：正式菜谱，包含内置菜谱和真实采集菜谱。
- `diy`：用户自制菜谱，按 `_openid` 归属当前用户。
- `banners`：首页轮播图。

常见菜谱字段：

- `id`：业务 ID，例如 `diy-...`、`xcf-...`。
- `title` / `name`：菜谱标题。
- `category`：分类，常见值有 `breakfast`、`lunch`、`dinner`、`dessert`、`custom`。
- `desc` / `description`：描述。
- `time` / `cookTimeText`：耗时文案。
- `cover` / `image` / `coverImage`：封面图。
- `materials`：材料文本数组。
- `ingredients`：结构化材料数组。
- `steps`：步骤数组。
- `recommended`：是否推荐。
- `createdAt`、`updatedAt`：创建和更新时间。

## 云函数

- `cloudfunctions/login`：返回当前用户的 `openid`、`appid`、`unionid`。
- `cloudfunctions/initData`：初始化或更新 `recipes` 和 `banners` 集合。

`initData` 会把内置 mock 菜谱和 `cloudfunctions/initData/realRecipes.js` 中的真实菜谱一起写入云数据库。写入逻辑是按业务 `id` upsert：已存在则更新，不存在则创建。

## 初始化和运行

推荐使用微信开发者工具打开项目根目录 `D:\自制小程序`。

基本步骤：

1. 用微信开发者工具导入当前目录。
2. 确认云开发环境 ID 与 `utils/config.js` 中的 `envId` 一致。
3. 在云数据库中创建集合：`recipes`、`banners`，项目里还会用到 `diy`。
4. 上传并部署云函数：`cloudfunctions/login`、`cloudfunctions/initData`。
5. 在云函数测试中执行 `initData`，用于初始化菜谱和轮播图数据。
6. 重新编译小程序。

## 缓存逻辑

`utils/api.js` 会缓存部分读取结果：

- 菜谱列表缓存键以 `cache:recipes:` 开头。
- 轮播图缓存键为 `cache:banners`。
- 缓存受 `config.cacheVersion` 和 `config.cacheMaxAge` 控制。
- 保存或删除菜谱、轮播图后会调用 `clearRecipeCache()` 清理相关缓存。

如果修改了数据结构或初始化数据，建议同步更新 `cacheVersion`，避免旧缓存影响调试。

## 收藏逻辑

收藏只保存菜谱 ID，存储键是：

```text
favoriteRecipes
```

详情页、首页和收藏页都会通过 `utils/favorite.js` 读取或更新收藏状态。

## 自制菜谱上传

`pages/add/add.js` 会：

1. 收集用户填写的菜谱信息。
2. 选择本地图片。
3. 如果启用云开发，则上传图片到云存储。
4. 构造菜谱 payload。
5. 调用 `api.saveDiyRecipe()` 保存到 `diy` 集合。

自制菜谱分类固定为 `custom`，并带有 `isCustom: true`。

## 管理员后台

管理员权限由 `utils/config.js` 的 `adminOpenids` 控制。

首页会根据当前 openid 判断是否显示管理入口。管理页可以：

- 新增或编辑正式菜谱。
- 删除菜谱。
- 新增或编辑轮播图。
- 删除轮播图。

开发时如果看不到管理入口，先确认：

- `login` 云函数是否部署成功。
- 本地缓存里是否已有 `openid`。
- 当前 openid 是否在 `adminOpenids` 中。

## 采集脚本

`scripts/collect-xiachufang-recipes.js` 用来从下厨房移动端页面采集真实菜谱，并下载图片到本地资源目录。

脚本输出目标：

```text
resource/recipes/
```

项目配置里打包时忽略了 `scripts`、`resource`、`cloudfunctions`、`CLOUD_SETUP.md` 等内容，避免上传到小程序包里。

## 组件说明

`components/floating-particles` 是一个 Canvas 粒子背景组件，用在首页等页面营造温暖、可爱的背景氛围。

主要参数：

- `enabled`：是否启用。
- `count`：粒子数量。
- `density`：密度，支持 `low`、`normal`、`high`。
- `opacity`：最大透明度。

## 开发注意事项

- 优先使用 `utils/api.js` 暴露的方法，不要在页面里直接访问云数据库，除非确实需要。
- 新增页面后要同步更新 `app.json` 的 `pages` 或 `subpackages`。
- 新增云函数后要确认 `project.config.json` 里的 `cloudfunctionRoot` 仍为 `cloudfunctions/`。
- 修改菜谱字段时，要同时检查 `cloudService.normalizeDoc()`、`mockService.normalizeRecipe()`、详情页和列表页。
- 删除菜谱时，云端实现会尝试删除相关 `cloud://` 文件；如果新增图片字段，也要检查删除逻辑是否覆盖。
- 这个项目部分中文内容在当前终端里可能显示为乱码，编辑中文文档时请保存为 UTF-8。
- 项目没有发现标准 npm 根依赖或测试脚本，主要通过微信开发者工具编译和预览验证。

## 给后续 Agent 的建议

- 先读 `utils/config.js`、`utils/api.js`、`utils/cloudService.js`，再改页面。
- 如果是 UI 问题，优先查看对应页面的 `.wxml`、`.wxss`、`.js` 三件套。
- 如果是数据问题，优先确认当前是否启用云开发，以及云函数和集合是否已经初始化。
- 如果是管理员权限问题，先查 `openid` 获取和 `adminOpenids` 白名单。
- 和毛毛解释问题时，可以先讲“发生了什么”，再讲“应该改哪里”，最后给出可执行步骤。
