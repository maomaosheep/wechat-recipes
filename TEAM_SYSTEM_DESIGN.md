# 小队邀请系统落地设计

## 1. 数据结构

当前实现使用这些集合：

- `users`
- `teams`
- `teamMembers`
- `teamInviteCodes`

其中 `teamInviteCodes` 是邀请码占用表，用来在数据库层保证邀请码全局唯一。如果你的云数据库里还没有这个集合，需要新增。

### users

用户主表，一位微信用户一条记录。

```js
{
  _id: '数据库文档 ID',
  openid: '微信 openid，全局唯一',
  nickName: '微信昵称',
  avatarUrl: '微信头像',
  teamId: '当前所属 teams._id，未加入时为空字符串',
  createdAt: 1710000000000,
  updatedAt: 1710000000000
}
```

索引要求：

- `openid` 唯一索引。

### teams

小队主表，一个小队一条记录。

```js
{
  _id: '数据库文档 ID',
  name: '小队名称',
  ownerOpenid: '队长 openid',
  inviteCode: '8 位全局唯一邀请码',
  status: 'active',
  maxMembers: 3,
  memberCount: 1,
  createdAt: 1710000000000,
  updatedAt: 1710000000000
}
```

索引要求：

- `inviteCode` 唯一索引，建议配置，作为团队主表的第二层防线。
- `ownerOpenid` 普通索引。

### teamMembers

小队成员关系表。一位用户只能属于一个小队。

```js
{
  _id: '数据库文档 ID',
  teamId: 'teams._id',
  openid: '成员 openid',
  role: 'owner | member',
  nickName: '加入时昵称快照',
  joinedByInviteCode: '加入时使用的邀请码，队长创建时为空',
  joinSource: 'createTeam | inviteCode | share',
  createdAt: 1710000000000,
  updatedAt: 1710000000000
}
```

索引要求：

- `openid` 唯一索引，用于数据库层阻止一个用户加入多个小队。
- `teamId` 普通索引，用于快速查询成员列表。
- 推荐：`teamId + openid` 组合唯一索引。

### teamInviteCodes

邀请码占用表。一条邀请码一条记录，文档 `_id` 直接等于邀请码。数据库文档 ID 天然唯一，因此可用于服务端占码防重。

```js
{
  _id: 'ABCDEFGH',
  inviteCode: 'ABCDEFGH',
  teamId: 'teams._id',
  ownerOpenid: '队长 openid',
  status: 'reserved | active | deleted',
  createdAt: 1710000000000,
  updatedAt: 1710000000000
}
```

索引要求：

- `_id` 天然唯一，不需要手动创建。
- `teamId` 普通索引，便于排查邀请码和队伍关系。

## 2. 邀请码生成规则

后端实现在 `cloudfunctions/kitchen/index.js`：

- 长度：8 位。
- 字符集：`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`。
- 排除容易混淆的 `I`、`O`、`0`、`1`。
- 生成后先写入 `teamInviteCodes`，且文档 `_id` 等于邀请码。
- `_id` 是数据库主键，天然唯一；如果占码冲突，后端自动重试。
- 最大重试次数：8 次。
- 仍建议配置 `teams.inviteCode` 唯一索引，形成双保险。

## 3. 后端接口设计

所有接口统一走云函数：

```js
wx.cloud.callFunction({
  name: 'kitchen',
  data: { action: 'createTeam', name, profile }
});
```

### createTeam

入参：

```js
{
  action: 'createTeam',
  name: '我们的温暖饭桌',
  profile: { nickName, avatarUrl }
}
```

后端逻辑：

1. 从云函数上下文获取 openid。
2. 更新或创建 `users` 记录。
3. 检查 `users.teamId` 和 `teamMembers.openid`，用户已有小队则返回 `USER_ALREADY_IN_TEAM`。
4. 生成 8 位邀请码。
5. 先写入 `teamInviteCodes` 完成占码。
6. 写入 `teams`。
7. 将 `teamInviteCodes.teamId` 绑定到新小队。
8. 写入 `teamMembers` 队长关系。
9. 回写 `users.teamId`。
10. 返回真实队伍与成员列表。

### generateInviteCode

入参：

```js
{
  action: 'generateInviteCode'
}
```

后端逻辑：

1. 查询当前用户所属队伍。
2. 校验当前用户是队长或管理员。
3. 生成 8 位邀请码。
4. 先写入 `teamInviteCodes` 占用新邀请码。
5. 更新当前团队的 `inviteCode`。
6. 释放旧邀请码占用记录。
7. 返回最新团队信息。

### joinTeam

入参：

```js
{
  action: 'joinTeam',
  inviteCode: 'ABCDEFGH',
  source: 'inviteCode | share',
  profile: { nickName, avatarUrl }
}
```

后端逻辑：

1. 校验邀请码不能为空。
2. 优先查询 `teamInviteCodes._id`，兼容旧数据时再查 `teams.inviteCode`。
3. 邀请码不存在返回 `INVITE_CODE_NOT_FOUND`。
4. 邀请码存在但 team 文档不存在或已删除，返回 `TEAM_NOT_FOUND`。
5. 查询 `teamMembers.openid`，用户已在当前队伍返回 `USER_ALREADY_IN_THIS_TEAM`。
6. 用户已在其他队伍返回 `USER_ALREADY_IN_OTHER_TEAM`。
7. 校验队伍人数是否已满，已满返回 `TEAM_FULL`。
8. 写入 `teamMembers`，并记录 `joinedByInviteCode`、`joinSource`。
9. 回写 `users.teamId`。
10. 复查成员数，若并发导致超员，则回滚本次成员关系并返回 `TEAM_FULL`。
11. 更新 `teams.memberCount`。
12. 返回真实队伍与成员列表。

### getMyTeam

入参：

```js
{ action: 'getMyTeam' }
```

返回：

```js
{
  user: { openid, nickName, avatarUrl, teamId },
  team: { id, name, inviteCode, ownerOpenid, memberCount },
  members: [
    { openid, role, nickName, avatarUrl }
  ]
}
```

## 4. 明确错误码

后端不会无条件 success，以下情况会抛出明确错误：

- `INVITE_CODE_REQUIRED`：邀请码为空。
- `INVITE_CODE_NOT_FOUND`：邀请码不存在。
- `TEAM_NOT_FOUND`：邀请码存在，但对应小队不存在或已删除。
- `TEAM_FULL`：小队满员。
- `USER_ALREADY_IN_THIS_TEAM`：用户已经在该小队。
- `USER_ALREADY_IN_OTHER_TEAM`：用户已经在其他小队。
- `USER_ALREADY_IN_TEAM`：用户已有小队或唯一索引拦截重复关系。
- `TEAM_JOIN_WRITE_FAILED`：成员关系写入失败。
- `TEAM_CREATE_FAILED`：小队创建失败。
- `TEAM_CREATE_WRITE_FAILED`：队长关系写入失败。
- `INVITE_CODE_GENERATE_FAILED`：邀请码多次生成仍冲突。

## 5. 前端调用示例

```js
async function submitInvite(inviteCode, profile, source = 'inviteCode') {
  try {
    const data = await api.joinTeam({ inviteCode, profile, source });
    this.setData({
      team: data.team,
      members: data.members,
      memberCount: data.members.length,
      hasTeam: !!data.team
    });
    wx.showToast({ title: '已加入小队', icon: 'success' });
  } catch (err) {
    wx.showToast({
      title: parseTeamError(err),
      icon: 'none'
    });
  }
}
```

## 6. 云数据库需要你配合确认

需要新增集合：

```text
teamInviteCodes
```

同时确认这些索引：

1. `users.openid` 唯一索引。
2. `teams.inviteCode` 唯一索引。
3. `teamMembers.openid` 唯一索引。
4. 推荐：`teamMembers(teamId, openid)` 组合唯一索引。
5. `teamInviteCodes.teamId` 普通索引。

`teamInviteCodes._id` 是数据库文档 ID，天然唯一，用于服务端占码。即使 `teams.inviteCode` 唯一索引未配置，也会先通过 `teamInviteCodes._id` 做占码防重；但真实上线仍建议把 `teams.inviteCode` 唯一索引配上，形成双保险。
