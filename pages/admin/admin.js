const api = require('../../utils/api');
const config = require('../../utils/config');
const { categories } = require('../../utils/recipes');

const editableCategories = categories.filter((item) => item.id !== 'all' && item.id !== 'custom');

function emptyRecipe() {
  return {
    id: '',
    title: '',
    desc: '',
    time: '',
    category: 'breakfast',
    cover: '',
    materialsText: '',
    stepsText: '',
    recommended: false
  };
}

function emptyBanner() {
  return {
    id: '',
    title: '',
    image: '',
    recipeId: '',
    sort: 1
  };
}

Page({
  data: {
    authorized: false,
    tab: 'recipes',
    categories: editableCategories,
    recipes: [],
    banners: [],
    recipeForm: emptyRecipe(),
    bannerForm: emptyBanner(),
    loading: true
  },

  onLoad() {
    this.checkPermission();
  },

  async checkPermission() {
    const openid = wx.getStorageSync('openid') || '';
    const authorized = config.adminOpenids.includes(openid) || !config.adminOpenids.length;
    this.setData({ authorized });
    if (!authorized) {
      wx.showToast({
        title: '无管理员权限',
        icon: 'none'
      });
      return;
    }
    this.loadData();
  },

  async loadData() {
    this.setData({ loading: true });
    const [recipes, banners] = await Promise.all([
      api.listAllRecipes(),
      api.listBanners()
    ]);
    this.setData({
      recipes,
      banners,
      loading: false
    });
  },

  switchTab(e) {
    this.setData({
      tab: e.currentTarget.dataset.tab
    });
  },

  updateRecipeField(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [`recipeForm.${field}`]: e.detail.value
    });
  },

  updateBannerField(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [`bannerForm.${field}`]: e.detail.value
    });
  },

  toggleRecommended(e) {
    this.setData({
      'recipeForm.recommended': e.detail.value
    });
  },

  pickCategory(e) {
    this.setData({
      'recipeForm.category': editableCategories[e.detail.value].id
    });
  },

  async chooseRecipeCover() {
    const filePath = await this.chooseAndPersistImage();
    if (filePath) {
      this.setData({
        'recipeForm.cover': filePath
      });
    }
  },

  async chooseBannerImage() {
    const filePath = await this.chooseAndPersistImage();
    if (filePath) {
      this.setData({
        'bannerForm.image': filePath
      });
    }
  },

  chooseAndPersistImage() {
    return new Promise((resolve) => {
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        success: async (res) => {
          const tempFilePath = res.tempFiles[0].tempFilePath;
          if (config.useCloud && wx.cloud) {
            const cloudPath = `recipes/${Date.now()}-${Math.floor(Math.random() * 10000)}.jpg`;
            wx.cloud.uploadFile({
                cloudPath,
                filePath: tempFilePath,
                success: (upload) => resolve(upload.fileID),
                fail: () => {
                  wx.showToast({ title: '上传失败', icon: 'none' });
                  resolve('');
                }
              });
            return;
          }

          wx.saveFile({
            tempFilePath,
            success: (fileRes) => resolve(fileRes.savedFilePath),
            fail: () => resolve(tempFilePath)
          });
        },
        fail: () => resolve('')
      });
    });
  },

  editRecipe(e) {
    const id = e.currentTarget.dataset.id;
    const recipe = this.data.recipes.find((item) => item.id === id || item._id === id);
    if (!recipe) return;
    this.setData({
      recipeForm: {
        id: recipe.id || recipe._id,
        title: recipe.title || recipe.name,
        desc: recipe.desc,
        time: recipe.time,
        category: recipe.category,
        cover: recipe.cover || recipe.image,
        materialsText: (recipe.materials || []).join('\n'),
        stepsText: (recipe.steps || []).map((step) => step.text || step).join('\n'),
        recommended: !!recipe.recommended
      }
    });
  },

  resetRecipeForm() {
    this.setData({
      recipeForm: emptyRecipe()
    });
  },

  async saveRecipe() {
    const form = this.data.recipeForm;
    const materials = form.materialsText.split('\n').map((item) => item.trim()).filter(Boolean);
    const steps = form.stepsText.split('\n').map((text) => text.trim()).filter(Boolean);

    if (!form.title || !form.cover || !form.desc || !form.time || !materials.length || !steps.length) {
      wx.showToast({ title: '请补全菜谱信息', icon: 'none' });
      return;
    }

    await api.saveRecipe({
      id: form.id,
      title: form.title,
      name: form.title,
      desc: form.desc,
      time: form.time,
      category: form.category,
      cover: form.cover,
      image: form.cover,
      materials,
      steps: steps.map((text) => ({ text, image: form.cover })),
      recommended: form.recommended
    });
    wx.showToast({ title: '菜谱已保存', icon: 'success' });
    this.resetRecipeForm();
    this.loadData();
  },

  deleteRecipe(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '删除菜谱',
      content: '确认删除这道菜谱吗？',
      confirmText: '删除',
      confirmColor: '#d95b6b',
      success: async (res) => {
        if (!res.confirm) return;
        await api.deleteRecipe(id);
        wx.showToast({ title: '已删除', icon: 'success' });
        this.loadData();
      }
    });
  },

  editBanner(e) {
    const id = e.currentTarget.dataset.id;
    const banner = this.data.banners.find((item) => item.id === id || item._id === id);
    if (!banner) return;
    this.setData({
      bannerForm: {
        id: banner.id || banner._id,
        title: banner.title,
        image: banner.image,
        recipeId: banner.recipeId,
        sort: banner.sort || 1
      }
    });
  },

  resetBannerForm() {
    this.setData({
      bannerForm: emptyBanner()
    });
  },

  async saveBanner() {
    const form = this.data.bannerForm;
    if (!form.title || !form.image || !form.recipeId) {
      wx.showToast({ title: '请补全轮播图信息', icon: 'none' });
      return;
    }

    await api.saveBanner(form);
    wx.showToast({ title: '轮播已保存', icon: 'success' });
    this.resetBannerForm();
    this.loadData();
  },

  deleteBanner(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '删除轮播图',
      content: '确认删除这张轮播图吗？',
      confirmText: '删除',
      confirmColor: '#d95b6b',
      success: async (res) => {
        if (!res.confirm) return;
        await api.deleteBanner(id);
        wx.showToast({ title: '已删除', icon: 'success' });
        this.loadData();
      }
    });
  }
});
