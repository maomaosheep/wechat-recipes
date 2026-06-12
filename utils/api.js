const config = require('./config');
const mockService = require('./mockService');
const cloudService = require('./cloudService');

const service = config.useCloud ? cloudService : mockService;

function getCache(key) {
  const cached = wx.getStorageSync(key);
  if (!cached) return null;
  if (cached.version !== config.cacheVersion) return null;
  if (Date.now() - cached.time > config.cacheMaxAge) return null;
  return cached.data;
}

function setCache(key, data) {
  wx.setStorageSync(key, {
    version: config.cacheVersion,
    time: Date.now(),
    data
  });
}

function clearRecipeCache() {
  const info = wx.getStorageInfoSync();
  info.keys
    .filter((key) => key.indexOf('cache:recipes:') === 0 || key === 'cache:banners')
    .forEach((key) => wx.removeStorageSync(key));
}

function clearTeamCache() {
  wx.removeStorageSync('cache:team');
}

function saveUserInfo(user) {
  const nextUser = user || {};
  wx.setStorageSync('userInfo', nextUser);
  const app = getApp();
  if (app && app.globalData) {
    app.globalData.userInfo = nextUser;
    if (nextUser.openid) {
      app.globalData.openid = nextUser.openid;
    }
  }
}

function isAuthError(err) {
  const message = String((err && (err.message || err.errMsg)) || '');
  return message.indexOf('NO_TEAM') >= 0
    || message.indexOf('NO_PERMISSION') >= 0
    || message.indexOf('INVALID_LOGIN') >= 0;
}

async function withReadFallback(readCloud, readMock, options = {}) {
  if (!config.useCloud) return readMock();
  try {
    return await readCloud();
  } catch (err) {
    if (isAuthError(err)) {
      wx.redirectTo({ url: '/pages/login/login' });
      throw err;
    }
    if (config.allowMockFallback && !options.strict) {
      return readMock();
    }
    throw err;
  }
}

async function listRecipes(params = {}) {
  const pageSize = params.pageSize || config.pageSize;
  const nextParams = {
    ...params,
    pageSize
  };
  const key = `cache:recipes:${nextParams.category || 'all'}:${nextParams.page || 1}:${pageSize}`;
  const cached = getCache(key);
  if (cached) return cached;

  const data = await withReadFallback(
    () => service.listRecipes(nextParams),
    () => mockService.listRecipes(nextParams),
    { strict: true }
  );
  setCache(key, data);
  return data;
}

async function listBanners() {
  const key = 'cache:banners';
  const cached = getCache(key);
  if (cached) return cached;

  let data = [];
  try {
    data = await withReadFallback(
      () => service.listBanners(),
      () => mockService.listBanners()
    );
  } catch (err) {
    console.warn('list banners failed', err);
    data = [];
  }
  setCache(key, data);
  return data;
}

async function listAllRecipes() {
  return withReadFallback(
    () => service.listAllRecipes(),
    () => mockService.listAllRecipes(),
    { strict: true }
  );
}

async function getRecipeById(id) {
  return withReadFallback(
    () => service.getRecipeById(id),
    () => mockService.getRecipeById(id),
    { strict: true }
  );
}

module.exports = {
  login: async (profile) => {
    const app = getApp();
    return app.login(profile);
  },
  getMyTeam: async () => {
    if (!config.useCloud) return null;
    const data = await service.callKitchen('getMyTeam');
    saveUserInfo(data.user);
    return data;
  },
  createTeam: async ({ name, profile }) => {
    const data = await service.callKitchen('createTeam', { name, profile });
    saveUserInfo(data.user);
    clearTeamCache();
    clearRecipeCache();
    return data;
  },
  joinTeam: async ({ inviteCode, profile, source }) => {
    const data = await service.callKitchen('joinTeam', { inviteCode, profile, source });
    saveUserInfo(data.user);
    clearTeamCache();
    clearRecipeCache();
    return data;
  },
  generateInviteCode: async () => {
    const data = await service.callKitchen('generateInviteCode');
    saveUserInfo(data.user);
    clearTeamCache();
    return data;
  },
  listRecipes,
  listBanners,
  listAllRecipes,
  getRecipeById,
  ensureCloudSeed: async () => {
    if (!config.useCloud || !service.ensureCloudSeed) return null;
    const res = await service.ensureCloudSeed();
    clearRecipeCache();
    return res;
  },
  saveDiyRecipe: async (recipe) => {
    const res = await service.saveDiyRecipe(recipe);
    clearRecipeCache();
    return res;
  },
  saveRecipe: async (recipe) => {
    const res = await service.saveRecipe(recipe);
    clearRecipeCache();
    return res;
  },
  deleteRecipe: async (recipe) => {
    const res = await service.deleteRecipe(recipe);
    clearRecipeCache();
    return res;
  },
  saveBanner: async (banner) => {
    const res = await service.saveBanner(banner);
    clearRecipeCache();
    return res;
  },
  deleteBanner: async (id) => {
    const res = await service.deleteBanner(id);
    clearRecipeCache();
    return res;
  },
  listFavorites: async () => {
    if (!config.useCloud || !service.listFavorites) return [];
    return withReadFallback(
      () => service.listFavorites(),
      () => Promise.resolve([])
    );
  },
  saveFavorite: async (recipeId) => {
    if (!config.useCloud || !service.saveFavorite) return null;
    return service.saveFavorite(recipeId);
  },
  deleteFavorite: async (recipeId) => {
    if (!config.useCloud || !service.deleteFavorite) return null;
    return service.deleteFavorite(recipeId);
  }
};
