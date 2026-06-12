const api = require('../../utils/api');

const errorTextMap = {
  INVALID_LOGIN: '登录状态异常，请重新进入小程序',
  LOGIN_NO_OPENID: '云函数没有拿到 openid，请检查云环境和 AppID 是否匹配',
  'function not found': 'login 云函数还没有部署到当前云环境',
  'ResourceNotFound.FunctionName': 'login 云函数还没有部署到当前云环境',
  'Environment not found': '云环境 ID 不正确，或者当前小程序没有开通这个云环境',
  'collection not exists': 'users 集合不存在或云函数没有数据库权限',
  '-501000': '云开发环境异常，请确认云环境 ID 和开发者工具账号'
};

function friendlyError(err, fallback) {
  const message = String((err && (err.message || err.errMsg)) || '');
  const matched = Object.keys(errorTextMap).find((key) => message.indexOf(key) >= 0);
  return matched ? errorTextMap[matched] : fallback;
}

function rawError(err) {
  return String((err && (err.message || err.errMsg || err.error)) || err || '');
}

function hasWechatProfile(user) {
  return !!(user && user.openid && (user.avatarUrl || user.nickName));
}

Page({
  data: {
    openid: '',
    profile: {},
    inviteCode: '',
    authorizing: false,
    particlesEnabled: true,
    particleOptions: {
      count: 72,
      density: 'high',
      opacity: 0.62
    }
  },

  async onLoad(options = {}) {
    const cachedOpenid = wx.getStorageSync('openid') || '';
    const cachedProfile = wx.getStorageSync('userInfo') || {};
    const pendingInviteCode = wx.getStorageSync('pendingInviteCode') || '';
    const inviteCode = options.inviteCode || pendingInviteCode || '';

    this.setData({
      openid: cachedOpenid,
      profile: cachedProfile,
      inviteCode
    });

    if (inviteCode) {
      wx.setStorageSync('pendingInviteCode', inviteCode);
    }

    try {
      const user = await getApp().ensureLogin();
      const teamData = await api.getMyTeam() || {};
      const profile = teamData.user || user || {};
      this.setData({
        openid: profile.openid || wx.getStorageSync('openid') || '',
        profile
      });
      if (hasWechatProfile(profile)) {
        this.goBackAfterLogin();
      }
    } catch (err) {
      console.warn('login preload skipped', err);
    }
  },

  authorizeProfile() {
    this.setData({ authorizing: true });
    wx.getUserProfile({
      desc: '用于展示你的微信头像和昵称',
      lang: 'zh_CN',
      success: async (res) => {
        try {
          const user = await api.login(res.userInfo);
          const profile = user || res.userInfo || {};
          this.setData({
            openid: profile.openid || wx.getStorageSync('openid') || '',
            profile,
            authorizing: false
          });
          wx.showToast({
            title: '登录成功',
            icon: 'success',
            success: () => {
              setTimeout(() => this.goBackAfterLogin(), 350);
            }
          });
        } catch (err) {
          console.error('authorize profile failed', err);
          this.setData({ authorizing: false });
          wx.showModal({
            title: '登录失败',
            content: `${friendlyError(err, '登录失败')}\n\n原始错误：${rawError(err) || '无详细错误'}`,
            showCancel: false,
            confirmText: '知道了'
          });
        }
      },
      fail: (err) => {
        console.warn('getUserProfile canceled or failed', err);
        this.setData({ authorizing: false });
        wx.showToast({
          title: '需要授权后才能继续',
          icon: 'none'
        });
      }
    });
  },

  goBackAfterLogin() {
    const inviteCode = this.data.inviteCode || wx.getStorageSync('pendingInviteCode') || '';
    if (inviteCode) {
      wx.setStorageSync('pendingInviteCode', inviteCode);
    }
    wx.switchTab({
      url: '/pages/friends/friends'
    });
  }
});
