const api = require('../../utils/api');
const config = require('../../utils/config');
const favorite = require('../../utils/favorite');

const categories = [
  { id: 'all', name: '全部', icon: '/assets/icons/category-all.svg' },
  { id: 'breakfast', name: '早餐', icon: '/assets/icons/category-breakfast.svg' },
  { id: 'lunch', name: '午餐', icon: '/assets/icons/category-lunch.svg' },
  { id: 'dinner', name: '晚餐', icon: '/assets/icons/category-dinner.svg' },
  { id: 'dessert', name: '甜点', icon: '/assets/icons/category-dessert.svg' },
  { id: 'custom', name: '自制', iconText: '+' }
];

function normalizeRows(list) {
  const favoriteIds = favorite.getFavoriteIds();
  return (list || []).map((item) => {
    const id = item.id || item._id;
    const timeText = typeof item.time === 'object'
      ? (item.time.text || item.cookTimeText || '')
      : (item.time || item.cookTimeText || '');
    return {
      ...item,
      id,
      timeText,
      scrollLeft: 0,
      favorited: favoriteIds.includes(id)
    };
  });
}

Page({
  data: {
    categories,
    activeCategory: 'all',
    banners: [],
    recipes: [],
    page: 1,
    pageSize: config.pageSize,
    hasMore: true,
    loading: true,
    loadingMore: false,
    isAdmin: false,
    team: null,
    searchKeyword: '',
    searchAllRecipes: [],
    particlesEnabled: true,
    particleOptions: {
      count: 72,
      density: 'high',
      opacity: 0.62
    }
  },

  onLoad() {
    this.checkAdmin();
  },

  async onShow() {
    try {
      await getApp().ensureAuthorizedProfile();
    } catch (err) {
      if (err && err.message === 'AUTH_REQUIRED') {
        return;
      }
      console.warn('profile auth check failed', err);
    }

    this.checkAdmin();
    try {
      const teamData = await api.getMyTeam() || {};
      this.setData({ team: teamData.team || null });
      await this.syncFavorites();
    } catch (err) {
      console.warn('team info skipped on home', err);
      this.setData({ team: null });
    }
    this.loadHome();
  },

  onReachBottom() {
    this.loadMore();
  },

  checkAdmin() {
    const openid = wx.getStorageSync('openid') || '';
    this.setData({
      isAdmin: config.adminOpenids.includes(openid)
    });
  },

  refreshFavoriteState() {
    if (!this.data.recipes.length) return;
    this.setData({
      recipes: normalizeRows(this.data.recipes)
    });
  },

  async syncFavorites() {
    try {
      const rows = await api.listFavorites();
      favorite.syncFromCloudRows(rows);
      this.refreshFavoriteState();
    } catch (err) {
      console.warn('sync favorites skipped', err);
    }
  },

  async loadHome() {
    if (this.data.searchKeyword.trim()) {
      this.loadSearch(true);
      return;
    }

    this.setData({
      loading: true,
      page: 1,
      hasMore: true
    });

    try {
      const recipeResult = await api.listRecipes({
        category: this.data.activeCategory,
        page: 1,
        pageSize: this.data.pageSize
      });
      let banners = [];
      try {
        banners = await api.listBanners();
      } catch (bannerErr) {
        console.warn('banner skipped', bannerErr);
      }

      this.setData({
        banners,
        recipes: normalizeRows(recipeResult.rows),
        hasMore: recipeResult.hasMore,
        loading: false
      });
    } catch (err) {
      console.error('load home failed', err);
      this.setData({ loading: false });
      wx.showToast({
        title: '加载失败，请稍后再试',
        icon: 'none'
      });
    }
  },

  async loadMore() {
    if (!this.data.hasMore || this.data.loadingMore || this.data.loading) return;

    if (this.data.searchKeyword.trim()) {
      this.loadSearch(false);
      return;
    }

    const nextPage = this.data.page + 1;
    this.setData({ loadingMore: true });

    try {
      const result = await api.listRecipes({
        category: this.data.activeCategory,
        page: nextPage,
        pageSize: this.data.pageSize
      });
      this.setData({
        recipes: [...this.data.recipes, ...normalizeRows(result.rows)],
        page: nextPage,
        hasMore: result.hasMore,
        loadingMore: false
      });
    } catch (err) {
      console.error('load more failed', err);
      this.setData({ loadingMore: false });
      wx.showToast({
        title: '加载更多失败',
        icon: 'none'
      });
    }
  },

  onSearchInput(e) {
    this.setData({
      searchKeyword: e.detail.value
    });
  },

  submitSearch() {
    this.loadSearch(true);
  },

  clearSearch() {
    this.setData({
      searchKeyword: '',
      searchAllRecipes: []
    });
    this.loadHome();
  },

  async loadSearch(reset) {
    const keyword = this.data.searchKeyword.trim().toLowerCase();
    if (!keyword) {
      this.loadHome();
      return;
    }

    const nextPage = reset ? 1 : this.data.page + 1;
    this.setData(reset ? { loading: true, page: 1, hasMore: true } : { loadingMore: true });

    try {
      const allRecipes = reset || !this.data.searchAllRecipes.length
        ? await api.listAllRecipes()
        : this.data.searchAllRecipes;
      const filtered = allRecipes
        .filter((recipe) => this.data.activeCategory === 'all' || recipe.category === this.data.activeCategory)
        .filter((recipe) => this.matchRecipe(recipe, keyword));
      const start = (nextPage - 1) * this.data.pageSize;
      const rows = filtered.slice(start, start + this.data.pageSize);

      this.setData({
        searchAllRecipes: allRecipes,
        recipes: reset ? normalizeRows(rows) : [...this.data.recipes, ...normalizeRows(rows)],
        page: nextPage,
        hasMore: start + this.data.pageSize < filtered.length,
        loading: false,
        loadingMore: false
      });
    } catch (err) {
      console.error('search failed', err);
      this.setData({
        loading: false,
        loadingMore: false
      });
      wx.showToast({
        title: '搜索失败',
        icon: 'none'
      });
    }
  },

  matchRecipe(recipe, keyword) {
    const steps = (recipe.steps || []).map((step) => step.text || step.stepText || step).join(' ');
    const haystack = [
      recipe.title,
      recipe.name,
      recipe.desc,
      recipe.time,
      ...(recipe.materials || []),
      steps
    ].join(' ').toLowerCase();
    return haystack.indexOf(keyword) >= 0;
  },

  async toggleFavorite(e) {
    const { id } = e.currentTarget.dataset;
    const wasFavorite = favorite.isFavorite(id);
    const ids = favorite.toggleFavorite(id);
    this.setData({
      recipes: this.data.recipes.map((item) => ({
        ...item,
        favorited: ids.includes(item.id)
      }))
    });
    try {
      if (wasFavorite) {
        await api.deleteFavorite(id);
      } else {
        await api.saveFavorite(id);
      }
      wx.showToast({
        title: wasFavorite ? '已取消' : '已收藏',
        icon: 'none'
      });
    } catch (err) {
      console.error('sync favorite failed', err);
      favorite.toggleFavorite(id);
      this.refreshFavoriteState();
      wx.showToast({
        title: '收藏同步失败',
        icon: 'none'
      });
    }
  },

  changeCategory(e) {
    const category = e.currentTarget.dataset.id;
    if (category === this.data.activeCategory) return;
    this.setData({
      activeCategory: category
    });
    this.loadHome();
  },

  openBanner(e) {
    const { recipeId } = e.currentTarget.dataset;
    if (!recipeId) return;
    wx.navigateTo({
      url: `/pages/detail/detail?id=${recipeId}`
    });
  },

  openDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    });
  },

  closeSwipeRows() {
    this.setData({
      recipes: this.data.recipes.map((item) => ({
        ...item,
        scrollLeft: 0
      }))
    });
  },

  confirmDeleteRecipe(e) {
    const { id, index } = e.currentTarget.dataset;
    const recipe = this.data.recipes[index];
    if (!recipe) return;

    wx.showModal({
      title: '删除菜谱',
      content: `确定删除「${recipe.title || recipe.name}」吗？`,
      confirmText: '删除',
      confirmColor: '#d95b6b',
      success: async (res) => {
        if (!res.confirm) {
          this.closeSwipeRows();
          return;
        }

        wx.showLoading({ title: '正在删除...' });
        try {
          await api.deleteRecipe(recipe);
          favorite.removeFavorite(id);
          this.setData({
            recipes: this.data.recipes.filter((item) => item.id !== id),
            searchAllRecipes: this.data.searchAllRecipes.filter((item) => (item.id || item._id) !== id)
          });
          wx.hideLoading();
          wx.showToast({
            title: '已删除',
            icon: 'success'
          });
        } catch (err) {
          console.error('delete recipe failed', err);
          wx.hideLoading();
          wx.showToast({
            title: '删除失败',
            icon: 'none'
          });
          this.closeSwipeRows();
        }
      }
    });
  },

  goAdd() {
    wx.navigateTo({
      url: '/pages/add/add'
    });
  },

  goWheel() {
    wx.switchTab({
      url: '/pages/wheel/wheel'
    });
  },

  goFriends() {
    wx.switchTab({
      url: '/pages/friends/friends'
    });
  },

  goAdmin() {
    wx.navigateTo({
      url: '/pages/admin/admin'
    });
  },

  toggleParticles(enabled) {
    this.setData({
      particlesEnabled: !!enabled
    });
  }
});
