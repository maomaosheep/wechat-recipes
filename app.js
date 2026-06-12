const config = require('./utils/config');

function hasWechatProfile(user) {
  return !!(user && user.openid && (user.avatarUrl || user.nickName));
}

App({
  onLaunch() {
    if (config.useCloud && wx.cloud) {
      wx.cloud.init({
        env: config.envId,
        traceUser: true
      });
    }

    if (!wx.getStorageSync('customRecipes')) {
      wx.setStorageSync('customRecipes', []);
    }

    if (config.useCloud && wx.cloud) {
      this.loginReady = this.login().catch((err) => {
        console.warn('silent login failed', err);
        return null;
      });
    }
  },

  login(profile) {
    if (!config.useCloud || !wx.cloud) {
      return Promise.resolve(null);
    }
    return wx.cloud.callFunction({
      name: 'login',
      data: profile ? { profile } : {}
    }).then((res) => {
      const result = res.result || {};
      if (result.error) {
        throw new Error(result.error);
      }
      const openid = result.openid;
      if (!openid) {
        throw new Error('LOGIN_NO_OPENID');
      }
      if (openid) {
        wx.setStorageSync('openid', openid);
        wx.setStorageSync('userInfo', result.user || {});
        this.globalData.openid = openid;
        this.globalData.userInfo = result.user || {};
      }
      return result.user || null;
    });
  },

  ensureLogin() {
    if (this.globalData.openid) {
      return Promise.resolve(this.globalData.userInfo);
    }
    const cachedOpenid = wx.getStorageSync('openid');
    const cachedUser = wx.getStorageSync('userInfo') || {};
    if (cachedOpenid) {
      this.globalData.openid = cachedOpenid;
      this.globalData.userInfo = cachedUser;
      return Promise.resolve(cachedUser);
    }
    if (!this.loginReady) {
      this.loginReady = this.login();
    }
    return this.loginReady;
  },

  ensureAuthorizedProfile() {
    return this.ensureLogin().then((user) => {
      const current = user || wx.getStorageSync('userInfo') || {};
      if (hasWechatProfile(current)) {
        return current;
      }
      wx.redirectTo({
        url: '/pages/login/login'
      });
      return Promise.reject(new Error('AUTH_REQUIRED'));
    });
  },

  requireTeam() {
    return this.ensureLogin().then((user) => {
      const current = user || wx.getStorageSync('userInfo') || {};
      if (current && current.teamId) return current;
      wx.redirectTo({
        url: '/pages/login/login'
      });
      return Promise.reject(new Error('NO_TEAM'));
    });
  },

  globalData: {
    openid: '',
    userInfo: {}
  }
});
