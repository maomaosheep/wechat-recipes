const favoriteKey = 'favoriteRecipes';

function getFavoriteIds() {
  return wx.getStorageSync(favoriteKey) || [];
}

function setFavoriteIds(ids) {
  wx.setStorageSync(favoriteKey, Array.from(new Set((ids || []).filter(Boolean))));
}

function syncFromCloudRows(rows) {
  const ids = (rows || []).map((item) => item.recipeId).filter(Boolean);
  setFavoriteIds(ids);
  return ids;
}

function isFavorite(id) {
  return getFavoriteIds().includes(id);
}

function toggleFavorite(id) {
  if (!id) return [];

  const ids = getFavoriteIds();
  const nextIds = ids.includes(id)
    ? ids.filter((item) => item !== id)
    : [...ids, id];

  setFavoriteIds(nextIds);
  return nextIds;
}

function removeFavorite(id) {
  const ids = getFavoriteIds();
  setFavoriteIds(ids.filter((item) => item !== id));
}

module.exports = {
  getFavoriteIds,
  setFavoriteIds,
  syncFromCloudRows,
  isFavorite,
  toggleFavorite,
  removeFavorite
};
