const api = require('../../utils/api');
const favorite = require('../../utils/favorite');

function normalizeRecipe(recipe) {
  const recipeId = recipe.id || recipe._id;
  const cover = recipe.cover || recipe.image || recipe.coverImage;
  const ingredients = recipe.ingredients || [];
  const materials = recipe.materials || ingredients.map((item) => `${item.name} ${item.amount}`.trim());

  return {
    ...recipe,
    id: recipeId,
    title: recipe.title || recipe.name,
    cover,
    timeText: typeof recipe.time === 'object'
      ? (recipe.time.text || recipe.cookTimeText || '')
      : (recipe.time || recipe.cookTimeText || ''),
    materials,
    steps: (recipe.steps || []).map((step, index) => {
      if (typeof step === 'string') {
        return {
          stepIndex: index + 1,
          text: step,
          image: cover
        };
      }
      return {
        stepIndex: step.stepIndex || index + 1,
        text: step.text || step.stepText,
        image: step.image || step.stepImage || cover
      };
    })
  };
}

Page({
  data: {
    recipe: null,
    isCustom: false,
    isFavorite: false,
    loading: true
  },

  onLoad(options) {
    this.loadRecipe(options.id);
  },

  async loadRecipe(id) {
    try {
      const recipe = await api.getRecipeById(id);
      if (!recipe) {
        wx.showToast({ title: '菜谱不见啦', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 800);
        return;
      }

      const normalized = normalizeRecipe(recipe);
      this.setData({
        recipe: normalized,
        isFavorite: favorite.isFavorite(normalized.id),
        isCustom: !!normalized.isCustom || normalized.category === 'custom',
        loading: false
      });
      wx.setNavigationBarTitle({ title: normalized.title });
      this.syncFavoriteState(normalized.id);
    } catch (err) {
      console.error('load detail failed', err);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  async syncFavoriteState(recipeId) {
    try {
      const rows = await api.listFavorites();
      const ids = favorite.syncFromCloudRows(rows);
      this.setData({ isFavorite: ids.includes(recipeId) });
    } catch (err) {
      console.warn('sync detail favorite skipped', err);
    }
  },

  async toggleFavorite() {
    const recipe = this.data.recipe;
    if (!recipe) return;

    const wasFavorite = this.data.isFavorite;
    const ids = favorite.toggleFavorite(recipe.id);
    const isFavorite = ids.includes(recipe.id);
    this.setData({ isFavorite });

    try {
      if (wasFavorite) {
        await api.deleteFavorite(recipe.id);
      } else {
        await api.saveFavorite(recipe.id);
      }
      wx.showToast({ title: isFavorite ? '已收藏' : '已取消', icon: 'none' });
    } catch (err) {
      console.error('toggle detail favorite failed', err);
      favorite.toggleFavorite(recipe.id);
      this.setData({ isFavorite: wasFavorite });
      wx.showToast({ title: '收藏同步失败', icon: 'none' });
    }
  }
});
