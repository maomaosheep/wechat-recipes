const api = require('../../utils/api');
const favorite = require('../../utils/favorite');

const palette = ['#f37c6b', '#77b7a8', '#f0b65f'];

const teamErrorText = {
  INVITE_CODE_REQUIRED: '好友邀请已失效',
  INVITE_CODE_NOT_FOUND: '好友邀请不存在或已失效',
  INVALID_INVITE_CODE: '好友邀请不存在或已失效',
  TEAM_NOT_FOUND: '这个小队不存在或已被删除',
  TEAM_FULL: '这个小队已经满员',
  USER_ALREADY_IN_THIS_TEAM: '你已经在这个小队里',
  USER_ALREADY_IN_OTHER_TEAM: '你已经加入了其他小队',
  USER_ALREADY_IN_TEAM: '你已经加入了小队',
  TEAM_JOIN_WRITE_FAILED: '加入失败，成员关系没有写入成功',
  TEAM_CREATE_FAILED: '创建小队失败，请稍后再试',
  TEAM_CREATE_WRITE_FAILED: '创建小队失败，队长关系没有写入成功',
  INVITE_CODE_GENERATE_FAILED: '邀请生成失败，请稍后再试'
};

function memberName(member, index) {
  return member.nickName || member.nickname || `饭友 ${index + 1}`;
}

function normalizeMember(member, index) {
  const name = memberName(member, index);
  return {
    ...member,
    nickname: name,
    initial: name.slice(0, 1).toUpperCase(),
    color: palette[index % palette.length]
  };
}

function ownerLabel(recipe, members) {
  const owner = members.find((item) => item.openid === recipe.creatorOpenid) || {};
  return recipe.creatorNickName || owner.nickname || '饭友';
}

function hasIdentity(user) {
  return !!(user && user.openid);
}

function hasWechatProfile(user) {
  return !!(user && user.openid && (user.avatarUrl || user.nickName));
}

function teamErrorCode(err) {
  const message = String((err && (err.code || err.message || err.errMsg)) || '');
  return Object.keys(teamErrorText).find((code) => message.indexOf(code) >= 0) || '';
}

function teamErrorMessage(err, fallback) {
  return teamErrorText[teamErrorCode(err)] || fallback;
}

function appError(code) {
  const err = new Error(code);
  err.code = code;
  return err;
}

function normalizeInviteCode(code) {
  return String(code || '').trim().toUpperCase();
}

Page({
  data: {
    profile: {},
    hasLogin: false,
    hasProfile: false,
    hasTeam: false,
    team: null,
    members: [],
    memberCount: 0,
    canInvite: false,
    teamName: '我们的温暖饭桌',
    shareInviteCode: '',
    shareJoinStatus: '',
    teamCustomRecipes: [],
    teamFavoriteRecipes: [],
    submitting: false,
    autoJoining: false,
    autoJoinTried: false,
    particlesEnabled: true,
    particleOptions: {
      count: 72,
      density: 'high',
      opacity: 0.62
    }
  },

  onLoad(options = {}) {
    const inviteCode = this.consumeShareInvite(options.inviteCode, !!options.inviteCode);
    if (inviteCode) {
      this.setData({
        shareInviteCode: inviteCode,
        shareJoinStatus: 'pending',
        autoJoinTried: false
      });
    }
    this.loadPage();
  },

  onShow() {
    const inviteCode = this.consumeShareInvite();
    if (inviteCode && inviteCode !== this.data.shareInviteCode) {
      this.setData({
        shareInviteCode: inviteCode,
        shareJoinStatus: 'pending',
        autoJoinTried: false
      });
    }
    this.loadPage();
  },

  onShareAppMessage() {
    const team = this.data.team || {};
    return {
      title: `加入「${team.name || '饭友小队'}」一起做饭`,
      path: `/pages/friends/friends?inviteCode=${team.inviteCode || ''}`
    };
  },

  consumeShareInvite(code, fromShare) {
    const nextCode = normalizeInviteCode(code || wx.getStorageSync('pendingInviteCode'));
    if (nextCode) {
      wx.setStorageSync('pendingInviteCode', nextCode);
      if (fromShare) {
        wx.setStorageSync('pendingInviteSource', 'share');
      }
    }
    return nextCode;
  },

  clearPendingInvite() {
    wx.removeStorageSync('pendingInviteCode');
    wx.removeStorageSync('pendingInviteSource');
  },

  applyTeamData(data = {}, fallbackProfile) {
    const profile = data.user || fallbackProfile || {};
    const team = data.team || null;
    const members = (data.members || []).map(normalizeMember);

    this.setData({
      profile,
      hasLogin: hasIdentity(profile),
      hasProfile: hasWechatProfile(profile),
      hasTeam: !!team,
      team: team ? { ...team, slogan: '今天也认真吃饭，认真分享。' } : null,
      members,
      memberCount: members.length,
      canInvite: members.length > 0 && members.length < 3
    });

    return members;
  },

  assertJoinResult(data, inviteCode) {
    const team = data && data.team;
    const members = data && data.members;
    const normalizedInput = normalizeInviteCode(inviteCode);
    const returnedCode = normalizeInviteCode(team && team.inviteCode);
    const currentOpenid = (data && data.user && data.user.openid) || (this.data.profile && this.data.profile.openid) || '';
    const isMember = Array.isArray(members) && members.some((member) => member.openid === currentOpenid);

    if (!team || !returnedCode) {
      throw appError('TEAM_NOT_FOUND');
    }
    if (returnedCode !== normalizedInput) {
      throw appError('INVITE_CODE_NOT_FOUND');
    }
    if (!isMember) {
      throw appError('TEAM_JOIN_WRITE_FAILED');
    }
  },

  async loadPage() {
    const cachedProfile = wx.getStorageSync('userInfo') || {};
    this.setData({
      profile: cachedProfile,
      hasLogin: hasIdentity(cachedProfile),
      hasProfile: hasWechatProfile(cachedProfile)
    });

    try {
      const user = await getApp().ensureLogin();
      const data = await api.getMyTeam() || {};
      const profile = data.user || user || cachedProfile || {};
      const members = this.applyTeamData(data, profile);

      if (data.team) {
        await this.loadTeamRecipes(members);
      } else {
        this.setData({
          teamCustomRecipes: [],
          teamFavoriteRecipes: []
        });
      }

      this.tryAutoJoinFromShare();
    } catch (err) {
      console.warn('load friends page skipped', err);
      this.setData({
        hasLogin: hasIdentity(cachedProfile),
        hasProfile: hasWechatProfile(cachedProfile),
        hasTeam: false,
        team: null,
        members: [],
        memberCount: 0,
        canInvite: false,
        teamCustomRecipes: [],
        teamFavoriteRecipes: []
      });
    }
  },

  onTeamNameInput(e) {
    this.setData({ teamName: e.detail.value });
  },

  goLogin() {
    const code = this.data.shareInviteCode;
    const url = code
      ? `/pages/login/login?inviteCode=${encodeURIComponent(code)}`
      : '/pages/login/login';
    if (code) {
      wx.setStorageSync('pendingInviteCode', code);
      wx.setStorageSync('pendingInviteSource', 'share');
    }
    wx.navigateTo({ url });
  },

  async createTeam() {
    if (!this.data.hasProfile) {
      this.goLogin();
      return;
    }

    const name = this.data.teamName.trim() || '我们的温暖饭桌';
    this.setData({ submitting: true });
    try {
      const data = await api.createTeam({ name, profile: this.data.profile });
      const members = this.applyTeamData(data, this.data.profile);
      await this.loadTeamRecipes(members);
      wx.showToast({ title: '小队已创建', icon: 'success' });
    } catch (err) {
      console.error('create team failed', err);
      wx.showToast({ title: teamErrorMessage(err, '创建失败，请稍后再试'), icon: 'none' });
    }
    this.setData({ submitting: false });
  },

  async tryAutoJoinFromShare() {
    const inviteCode = this.data.shareInviteCode;
    if (!inviteCode || this.data.autoJoining || this.data.autoJoinTried) return;

    if (!this.data.hasProfile) {
      wx.setStorageSync('pendingInviteCode', inviteCode);
      wx.setStorageSync('pendingInviteSource', 'share');
      this.setData({ shareJoinStatus: 'needLogin' });
      this.goLogin();
      return;
    }

    if (this.data.hasTeam) {
      const currentCode = normalizeInviteCode(this.data.team && this.data.team.inviteCode);
      if (currentCode === inviteCode) {
        this.clearPendingInvite();
        this.setData({
          shareInviteCode: '',
          shareJoinStatus: 'joined',
          autoJoinTried: true
        });
        wx.showToast({ title: '已在小队中', icon: 'none' });
      } else {
        this.setData({
          shareJoinStatus: 'failed',
          autoJoinTried: true
        });
        wx.showToast({ title: '你已经加入了其他小队', icon: 'none' });
      }
      return;
    }

    this.setData({
      autoJoining: true,
      autoJoinTried: true,
      shareJoinStatus: 'joining'
    });

    try {
      const data = await api.joinTeam({
        inviteCode,
        profile: this.data.profile,
        source: 'share'
      });
      this.assertJoinResult(data, inviteCode);
      const members = this.applyTeamData(data, this.data.profile);
      await this.loadTeamRecipes(members);
      this.clearPendingInvite();
      this.setData({
        shareInviteCode: '',
        shareJoinStatus: 'joined'
      });
      wx.showToast({ title: '已加入好友小队', icon: 'success' });
    } catch (err) {
      console.error('auto join from share failed', err);
      this.setData({ shareJoinStatus: 'failed' });
      wx.showToast({ title: teamErrorMessage(err, '加入失败，请让好友重新分享'), icon: 'none' });
    }

    this.setData({ autoJoining: false });
  },

  async loadTeamRecipes(members) {
    try {
      const favoriteRows = await api.listFavorites();
      const favoriteIds = favorite.syncFromCloudRows(favoriteRows);
      const recipes = await api.listAllRecipes();
      const withOwner = recipes.map((recipe) => ({
        ...recipe,
        ownerName: ownerLabel(recipe, members)
      }));

      this.setData({
        teamCustomRecipes: withOwner.filter((recipe) => recipe.isCustom || recipe.category === 'custom').slice(0, 6),
        teamFavoriteRecipes: withOwner.filter((recipe) => favoriteIds.includes(recipe.id || recipe._id)).slice(0, 6)
      });
    } catch (err) {
      console.warn('load team recipes failed', err);
      this.setData({
        teamCustomRecipes: [],
        teamFavoriteRecipes: []
      });
    }
  },

  openRecipe(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    });
  },

  goAdd() {
    wx.navigateTo({
      url: '/pages/add/add'
    });
  }
});
