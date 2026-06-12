const db = () => wx.cloud.database();
let seedPromise = null;

function parseErrorCode(err) {
  const raw = String((err && (err.message || err.errMsg || err.error || err.code || err.errCode)) || '');
  const codes = [
    'INVITE_CODE_REQUIRED',
    'INVITE_CODE_NOT_FOUND',
    'INVALID_INVITE_CODE',
    'TEAM_NOT_FOUND',
    'TEAM_FULL',
    'USER_ALREADY_IN_THIS_TEAM',
    'USER_ALREADY_IN_OTHER_TEAM',
    'USER_ALREADY_IN_TEAM',
    'TEAM_JOIN_WRITE_FAILED',
    'TEAM_CREATE_FAILED',
    'TEAM_CREATE_WRITE_FAILED',
    'INVITE_CODE_GENERATE_FAILED',
    'NO_TEAM',
    'NO_PERMISSION',
    'INVALID_LOGIN'
  ];
  return codes.find((code) => raw.indexOf(code) >= 0) || '';
}

function callKitchen(action, data = {}) {
  return wx.cloud.callFunction({
    name: 'kitchen',
    data: {
      action,
      ...data
    }
  }).then((res) => {
    const result = res.result;
    if (result && result.error) {
      const error = new Error(result.error);
      error.code = result.error;
      throw error;
    }
    return result;
  }).catch((err) => {
    const code = parseErrorCode(err);
    if (code) {
      const error = new Error(code);
      error.code = code;
      throw error;
    }
    throw err;
  });
}

function normalizeDoc(doc) {
  const ingredients = doc.ingredients || [];
  const materials = doc.materials || ingredients.map((item) => `${item.name} ${item.amount}`.trim());
  const timeText = typeof doc.time === 'object'
    ? (doc.time.text || doc.cookTimeText || '')
    : (doc.time || doc.cookTimeText || '');
  const steps = (doc.steps || []).map((step, index) => ({
    stepIndex: step.stepIndex || index + 1,
    text: step.text || step.stepText,
    image: step.image || step.stepImage || doc.coverImage || doc.cover || doc.image,
    stepText: step.stepText || step.text,
    stepImage: step.stepImage || step.image || doc.coverImage || doc.cover || doc.image
  }));

  return {
    ...doc,
    id: doc.id || doc._id,
    title: doc.title || doc.name,
    name: doc.name || doc.title,
    cover: doc.cover || doc.image || doc.coverImage,
    image: doc.image || doc.cover || doc.coverImage,
    coverImage: doc.coverImage || doc.cover || doc.image,
    creatorNickName: doc.creatorNickName || doc.nickName || '',
    timeText,
    materials,
    ingredients,
    steps
  };
}

async function hasRealRecipes() {
  try {
    const res = await db().collection('recipes')
      .where({
        id: db().RegExp({
          regexp: '^xcf-',
          options: ''
        })
      })
      .limit(1)
      .get();
    return res.data.length > 0;
  } catch (err) {
    const res = await db().collection('recipes').where({ id: 'xcf-102203515' }).limit(1).get();
    return res.data.length > 0;
  }
}

async function ensureCloudSeed() {
  if (seedPromise) return seedPromise;

  seedPromise = hasRealRecipes()
    .then((hasReal) => {
      if (hasReal) return { skipped: true };
      return wx.cloud.callFunction({ name: 'initData' });
    })
    .catch((err) => {
      console.warn('ensure cloud seed skipped', err);
      return { skipped: true, error: err && err.errMsg ? err.errMsg : 'seed failed' };
    })
    .finally(() => {
      seedPromise = null;
    });

  return seedPromise;
}

async function listRecipes({ category = 'all', page = 1, pageSize = 6 } = {}) {
  await ensureCloudSeed();
  const result = await callKitchen('listRecipes', { category, page, pageSize });
  return {
    ...result,
    rows: (result.rows || []).map(normalizeDoc)
  };
}

async function listAllRecipes() {
  await ensureCloudSeed();
  const rows = await callKitchen('listAllRecipes');
  return (rows || []).map(normalizeDoc);
}

async function getRecipeById(id) {
  const recipe = await callKitchen('getRecipeById', { id });
  return recipe ? normalizeDoc(recipe) : null;
}

function collectCloudFileIds(recipe) {
  const ids = [];
  const fields = [
    recipe.cover,
    recipe.image,
    recipe.coverImage,
    ...(recipe.steps || []).map((step) => step.image || step.stepImage)
  ];

  fields.forEach((value) => {
    if (typeof value === 'string' && value.indexOf('cloud://') === 0 && !ids.includes(value)) {
      ids.push(value);
    }
  });

  return ids;
}

async function deleteCloudFiles(recipe) {
  const fileList = collectCloudFileIds(recipe);
  if (!fileList.length) return null;

  try {
    return await wx.cloud.deleteFile({ fileList });
  } catch (err) {
    console.warn('delete cloud files failed', err);
    return null;
  }
}

async function saveRecipe(recipe) {
  const saved = await callKitchen('saveRecipe', { recipe });
  return normalizeDoc(saved);
}

async function saveDiyRecipe(recipe) {
  return saveRecipe({
    ...recipe,
    category: 'custom',
    isCustom: true
  });
}

async function deleteRecipe(recipeOrId) {
  const id = typeof recipeOrId === 'string' ? recipeOrId : (recipeOrId.id || recipeOrId._id);
  if (typeof recipeOrId !== 'string') {
    await deleteCloudFiles(recipeOrId);
  }
  return callKitchen('deleteRecipe', { id });
}

async function listBanners() {
  const res = await db().collection('banners').orderBy('sort', 'asc').get();
  return res.data.map((item) => ({ ...item, id: item._id || item.id }));
}

async function saveBanner(banner) {
  const docId = banner._id;
  const bizId = banner.id;
  const payload = {
    id: bizId,
    image: banner.image,
    recipeId: banner.recipeId,
    title: banner.title,
    sort: Number(banner.sort || 0),
    updatedAt: Date.now()
  };

  if (docId) {
    await db().collection('banners').doc(docId).update({
      data: payload
    });
    return { ...payload, id: bizId || docId, _id: docId };
  }

  if (bizId) {
    const existed = await db().collection('banners').where({ id: bizId }).limit(1).get();
    if (existed.data.length) {
      await db().collection('banners').doc(existed.data[0]._id).update({
        data: payload
      });
      return { ...payload, id: bizId, _id: existed.data[0]._id };
    }
  }

  const res = await db().collection('banners').add({
    data: {
      ...payload,
      createdAt: Date.now()
    }
  });
  return { ...payload, id: bizId || res._id, _id: res._id };
}

async function deleteBanner(id) {
  try {
    return await db().collection('banners').doc(id).remove();
  } catch (err) {
    const res = await db().collection('banners').where({ id }).limit(1).get();
    if (!res.data.length) return null;
    return db().collection('banners').doc(res.data[0]._id).remove();
  }
}

async function listFavorites() {
  return callKitchen('listFavorites');
}

async function saveFavorite(recipeId) {
  return callKitchen('saveFavorite', { recipeId });
}

async function deleteFavorite(recipeId) {
  return callKitchen('deleteFavorite', { recipeId });
}

module.exports = {
  callKitchen,
  listRecipes,
  listAllRecipes,
  getRecipeById,
  saveDiyRecipe,
  saveRecipe,
  deleteRecipe,
  ensureCloudSeed,
  listBanners,
  saveBanner,
  deleteBanner,
  listFavorites,
  saveFavorite,
  deleteFavorite
};
