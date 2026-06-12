const { recipes, banners } = require('./recipes');

const recipeKey = 'mockRecipes';
const bannerKey = 'mockBanners';

function ensureSeed() {
  if (!wx.getStorageSync(recipeKey)) {
    wx.setStorageSync(recipeKey, recipes);
  }
  if (!wx.getStorageSync(bannerKey)) {
    wx.setStorageSync(bannerKey, banners);
  }
}

function getRecipes() {
  ensureSeed();
  const mockRecipes = wx.getStorageSync(recipeKey) || [];
  const customRecipes = wx.getStorageSync('customRecipes') || [];
  const normalizedCustom = customRecipes.map((item) => ({
    ...item,
    title: item.title || item.name,
    cover: item.cover || item.image,
    isCustom: true,
    category: 'custom'
  }));
  return [...mockRecipes, ...normalizedCustom].map(normalizeRecipe);
}

function normalizeRecipe(recipe) {
  const ingredients = recipe.ingredients || [];
  const materials = recipe.materials || ingredients.map((item) => `${item.name} ${item.amount}`.trim());
  const steps = (recipe.steps || []).map((step, index) => {
    if (typeof step === 'string') {
      return {
        stepIndex: index + 1,
        text: step,
        image: recipe.coverImage || recipe.cover || recipe.image
      };
    }
    return {
      ...step,
      stepIndex: step.stepIndex || index + 1,
      text: step.text || step.stepText,
      image: step.image || step.stepImage || recipe.coverImage || recipe.cover || recipe.image,
      stepText: step.stepText || step.text,
      stepImage: step.stepImage || step.image
    };
  });

  return {
    ...recipe,
    title: recipe.title || recipe.name,
    name: recipe.name || recipe.title,
    cover: recipe.cover || recipe.image || recipe.coverImage,
    image: recipe.image || recipe.cover || recipe.coverImage,
    coverImage: recipe.coverImage || recipe.cover || recipe.image,
    materials,
    ingredients,
    steps
  };
}

function paginate(list, page, pageSize) {
  const start = (page - 1) * pageSize;
  const rows = list.slice(start, start + pageSize);
  return {
    rows,
    hasMore: start + pageSize < list.length,
    total: list.length
  };
}

function listRecipes({ category = 'all', page = 1, pageSize = 6 } = {}) {
  const list = getRecipes().filter((item) => category === 'all' || item.category === category);
  return Promise.resolve(paginate(list, page, pageSize));
}

function listAllRecipes() {
  return Promise.resolve(getRecipes());
}

function getRecipeById(id) {
  const recipe = getRecipes().find((item) => item.id === id || item._id === id);
  return Promise.resolve(recipe || null);
}

function saveRecipe(recipe) {
  ensureSeed();
  const nextRecipe = {
    ...recipe,
    id: recipe.id || `recipe-${Date.now()}`,
    title: recipe.title || recipe.name,
    name: recipe.name || recipe.title,
    cover: recipe.cover || recipe.image,
    image: recipe.image || recipe.cover,
    updatedAt: Date.now()
  };
  const list = wx.getStorageSync(recipeKey) || [];
  const index = list.findIndex((item) => item.id === nextRecipe.id);
  if (index >= 0) {
    list[index] = nextRecipe;
  } else {
    list.unshift(nextRecipe);
  }
  wx.setStorageSync(recipeKey, list);
  return Promise.resolve(nextRecipe);
}

function saveDiyRecipe(recipe) {
  const nextRecipe = {
    ...recipe,
    id: recipe.id || `diy-${Date.now()}`,
    title: recipe.title || recipe.name,
    name: recipe.name || recipe.title,
    cover: recipe.cover || recipe.image || recipe.coverImage,
    image: recipe.image || recipe.cover || recipe.coverImage,
    coverImage: recipe.coverImage || recipe.cover || recipe.image,
    isCustom: true,
    category: 'custom',
    updatedAt: Date.now()
  };
  const list = wx.getStorageSync('customRecipes') || [];
  const index = list.findIndex((item) => item.id === nextRecipe.id);
  if (index >= 0) {
    list[index] = nextRecipe;
  } else {
    list.unshift(nextRecipe);
  }
  wx.setStorageSync('customRecipes', list);
  return Promise.resolve(nextRecipe);
}

function deleteRecipe(recipeOrId) {
  ensureSeed();
  const id = typeof recipeOrId === 'string' ? recipeOrId : (recipeOrId.id || recipeOrId._id);
  const list = wx.getStorageSync(recipeKey) || [];
  const customList = wx.getStorageSync('customRecipes') || [];
  wx.setStorageSync(recipeKey, list.filter((item) => item.id !== id && item._id !== id));
  wx.setStorageSync('customRecipes', customList.filter((item) => item.id !== id && item._id !== id));
  return Promise.resolve();
}

function listBanners() {
  ensureSeed();
  const list = (wx.getStorageSync(bannerKey) || []).sort((a, b) => (a.sort || 0) - (b.sort || 0));
  return Promise.resolve(list);
}

function saveBanner(banner) {
  ensureSeed();
  const nextBanner = {
    ...banner,
    id: banner.id || `banner-${Date.now()}`,
    sort: Number(banner.sort || 0),
    updatedAt: Date.now()
  };
  const list = wx.getStorageSync(bannerKey) || [];
  const index = list.findIndex((item) => item.id === nextBanner.id);
  if (index >= 0) {
    list[index] = nextBanner;
  } else {
    list.push(nextBanner);
  }
  wx.setStorageSync(bannerKey, list.sort((a, b) => (a.sort || 0) - (b.sort || 0)));
  return Promise.resolve(nextBanner);
}

function deleteBanner(id) {
  ensureSeed();
  const list = wx.getStorageSync(bannerKey) || [];
  wx.setStorageSync(bannerKey, list.filter((item) => item.id !== id));
  return Promise.resolve();
}

module.exports = {
  listRecipes,
  listAllRecipes,
  getRecipeById,
  saveDiyRecipe,
  saveRecipe,
  deleteRecipe,
  listBanners,
  saveBanner,
  deleteBanner
};
