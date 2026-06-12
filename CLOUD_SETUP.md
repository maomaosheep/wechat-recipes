# 云开发配置说明

当前项目已启用云开发：

```js
envId: 'cloud1-d1g647ojy78e6a6d1'
useCloud: true
```

## 1. 数据库集合

请在微信开发者工具中打开：

```text
云开发 -> 数据库
```

创建以下集合：

```text
recipes
banners
users
teams
teamInviteCodes
teamMembers
favorites
```

建议把 `recipes`、`users`、`teams`、`teamMembers`、`favorites` 设置为“仅云函数可读写”。团队隔离和菜谱权限由 `cloudfunctions/kitchen` 统一校验，不建议让小程序端直接读写这些集合。

`banners` 可保留小程序端可读，管理写入仍建议只给管理员使用。

### 小队系统索引要求

小队邀请不是纯前端功能，必须依赖数据库唯一索引保证真实防重。请同时阅读：

```text
TEAM_SYSTEM_DESIGN.md
```

上线前必须确认：

- `users.openid` 唯一索引。
- `teamInviteCodes` 集合必须存在，邀请码会作为文档 `_id` 写入，天然唯一。
- `teamInviteCodes.teamId` 普通索引。
- `teams.inviteCode` 唯一索引。
- `teamMembers.openid` 唯一索引。
- 推荐增加 `teamMembers(teamId, openid)` 组合唯一索引。

## 2. 上传云函数

右键以下云函数目录，选择“上传并部署：云端安装依赖”：

```text
cloudfunctions/login
cloudfunctions/kitchen
cloudfunctions/initData
```

说明：

- `login`：获取 openid，并持久化微信昵称、头像和用户记录。
- `kitchen`：处理团队创建、邀请码加入、成员列表、菜谱读写、收藏读写和全局权限校验。
- `initData`：初始化示例菜谱和轮播图数据。

## 3. 初始化示例数据

上传部署 `initData` 后，在微信开发者工具中执行：

```text
云开发 -> 云函数 -> initData -> 测试
```

参数可留空：

```json
{}
```

执行成功会返回创建/更新数量。重复执行不会无限新增，会按业务 `id` 更新已有数据。

## 4. 登录与团队

首次进入受限页面时，小程序会跳转到 `pages/login/login`：

1. 点击“微信快捷登录”授权昵称。
2. 创建团队，或输入好友邀请码加入团队。
3. 团队最多 3 人。

饭友页 `pages/friends/friends` 会展示成员列表和邀请码，可通过分享邀请好友加入。

## 5. 权限规则

核心权限在 `cloudfunctions/kitchen` 内统一生效：

- 菜谱保存时写入 `teamId`、`creatorOpenid`、`creatorNickName`。
- 查询菜谱时只返回当前用户团队内的数据，以及没有 `teamId` 的初始化公共菜谱。
- 已绑定其他 `teamId` 的菜谱对当前团队不可见、不可读、不可改、不可删。
- 收藏数据按 `teamId` 存储和查询。
- 团队成员列表只返回当前用户所在团队成员。

## 6. 真实菜谱资源

正式上线建议把 `resource/recipes` 下的图片上传到云存储，再把数据库里的图片 URL 替换成云存储 fileID 或 CDN URL。

轮播图的 `recipeId` 必须等于菜谱的 `id`。

## 7. 管理员白名单

管理员 openid 配置在：

```text
utils/config.js
```

同时 `cloudfunctions/kitchen/index.js` 中也保留了同一份管理员 openid，用于云函数端的写入/删除兜底校验。如需调整管理员，请同步更新两处。
