const api = require('../../utils/api');
const favorite = require('../../utils/favorite');

function normalizeRows(list) {
  return (list || []).map((item) => ({
    ...item,
    id: item.id || item._id,
    scrollLeft: 0
  }));
}

Page({
  data: {
    favorites: []
  },

  onShow() {
    this.loadFavorites();
  },

  async loadFavorites() {
    try {
      const favoriteRows = await api.listFavorites();
      const ids = favorite.syncFromCloudRows(favoriteRows);
      if (!ids.length) {
        this.setData({ favorites: [] });
        return;
      }

      const recipes = await api.listAllRecipes();
      this.setData({
        favorites: normalizeRows(recipes.filter((item) => ids.includes(item.id || item._id)))
      });
    } catch (err) {
      console.warn('load cloud favorites failed, use local cache', err);
      const ids = favorite.getFavoriteIds();
      if (!ids.length) {
        this.setData({ favorites: [] });
        return;
      }
      const recipes = await api.listAllRecipes();
      this.setData({
        favorites: normalizeRows(recipes.filter((item) => ids.includes(item.id || item._id)))
      });
    }
  },

  openDetail(e) {
    wx.navigateTo({
      url: `/pages/detail/detail?id=${e.currentTarget.dataset.id}`
    });
  },

  closeSwipeRows() {
    this.setData({
      favorites: this.data.favorites.map((item) => ({
        ...item,
        scrollLeft: 0
      }))
    });
  },

  confirmDeleteRecipe(e) {
    const { id, index } = e.currentTarget.dataset;
    const recipe = this.data.favorites[index];
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
          await api.deleteFavorite(id);
          favorite.removeFavorite(id);
          this.setData({
            favorites: this.data.favorites.filter((item) => item.id !== id)
          });
          wx.hideLoading();
          wx.showToast({ title: '已删除', icon: 'success' });
        } catch (err) {
          console.error('delete favorite recipe failed', err);
          wx.hideLoading();
          wx.showToast({ title: '删除失败', icon: 'none' });
          this.closeSwipeRows();
        }
      }
    });
  }
});
