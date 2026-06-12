const api = require('../../utils/api');
const config = require('../../utils/config');

function makeId() {
  return `diy-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

Page({
  data: {
    name: '',
    desc: '',
    time: '',
    image: '',
    materials: [''],
    steps: [''],
    saving: false
  },

  async onLoad() {
    try {
      await getApp().requireTeam();
    } catch (err) {}
  },

  updateField(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [field]: e.detail.value
    });
  },

  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const file = res.tempFiles[0];
        this.setData({
          image: file.tempFilePath
        });
      }
    });
  },

  updateListItem(e) {
    const { type, index } = e.currentTarget.dataset;
    const list = [...this.data[type]];
    list[index] = e.detail.value;
    this.setData({
      [type]: list
    });
  },

  addListItem(e) {
    const { type } = e.currentTarget.dataset;
    this.setData({
      [type]: [...this.data[type], '']
    });
  },

  removeListItem(e) {
    const { type, index } = e.currentTarget.dataset;
    const list = this.data[type].filter((_, itemIndex) => itemIndex !== index);
    this.setData({
      [type]: list.length ? list : ['']
    });
  },

  async getOpenid() {
    const cached = wx.getStorageSync('openid');
    if (cached) return cached;

    const app = getApp();
    const user = await app.ensureLogin();
    return user && user.openid ? user.openid : wx.getStorageSync('openid');
  },

  async uploadCover(recipeId) {
    if (!config.useCloud || !wx.cloud) {
      return this.data.image;
    }

    const openid = await this.getOpenid();
    if (!openid) {
      throw new Error('openid missing');
    }

    const extMatch = this.data.image.match(/\.(jpg|jpeg|png|webp)$/i);
    const ext = extMatch ? extMatch[1].toLowerCase().replace('jpeg', 'jpg') : 'jpg';
    const storageRoot = config.cloudStorageRoot || 'recipes';
    const cloudPath = `${storageRoot}/recipes/${openid}/${recipeId}/cover.${ext}`;
    const upload = await new Promise((resolve, reject) => {
      wx.cloud.uploadFile({
        cloudPath,
        filePath: this.data.image,
        success: resolve,
        fail: reject
      });
    });

    if (!upload.fileID) {
      throw new Error('upload fileID missing');
    }

    return upload.fileID;
  },

  buildPayload(recipeId, coverFileID) {
    const userInfo = wx.getStorageSync('userInfo') || {};
    const name = this.data.name.trim();
    const desc = this.data.desc.trim();
    const time = this.data.time.trim();
    const materials = this.data.materials.map((item) => item.trim()).filter(Boolean);
    const ingredients = materials.map((item) => {
      const parts = item.split(/\s+/);
      return {
        name: parts[0] || item,
        amount: parts.slice(1).join(' ')
      };
    });
    const steps = this.data.steps
      .map((item) => item.trim())
      .filter(Boolean)
      .map((text, index) => ({
        stepIndex: index + 1,
        text,
        stepText: text,
        image: coverFileID,
        stepImage: coverFileID
      }));

    return {
      id: recipeId,
      title: name,
      name,
      desc,
      description: desc,
      time,
      cookingTime: time,
      category: 'custom',
      isCustom: true,
      cover: coverFileID,
      image: coverFileID,
      coverImage: coverFileID,
      materials,
      ingredients,
      steps,
      creatorNickName: userInfo.nickName || '',
      recommended: false
    };
  },

  validateForm() {
    const name = this.data.name.trim();
    const desc = this.data.desc.trim();
    const time = this.data.time.trim();
    const materials = this.data.materials.map((item) => item.trim()).filter(Boolean);
    const steps = this.data.steps.map((item) => item.trim()).filter(Boolean);

    if (!name || !desc || !time || !this.data.image || !materials.length || !steps.length) {
      wx.showToast({
        title: '把信息补完整哦',
        icon: 'none'
      });
      return false;
    }

    if (config.useCloud && !wx.cloud) {
      wx.showToast({
        title: '当前环境未启用云开发',
        icon: 'none'
      });
      return false;
    }

    return true;
  },

  async saveRecipe() {
    if (this.data.saving || !this.validateForm()) return;

    const recipeId = makeId();
    this.setData({ saving: true });
    wx.showLoading({ title: '正在上传...' });

    try {
      const coverFileID = await this.uploadCover(recipeId);
      const recipe = this.buildPayload(recipeId, coverFileID);

      if (config.useCloud) {
        await api.saveDiyRecipe(recipe);
      } else {
        await api.saveRecipe(recipe);
      }

      wx.hideLoading();
      wx.showToast({
        title: '已上传',
        icon: 'success'
      });
      setTimeout(() => wx.navigateBack(), 700);
    } catch (err) {
      console.error('save diy recipe failed', err);
      wx.hideLoading();
      wx.showToast({
        title: '上传失败，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ saving: false });
    }
  }
});
