const config = {
  useCloud: true,
  envId: 'cloud1-d1g647ojy78e6a6d1',
  adminOpenids: [
    'o6zAJs3jcRoW3LJC_jOmmWaOwHNA'
  ],
  pageSize: 6,
  cacheVersion: 'cloud-real-v3',
  allowMockFallback: false,
  cacheMaxAge: 5 * 60 * 1000,
  cloudStorageRoot: '\u81ea\u5236\u5c0f\u7a0b\u5e8f',
  imagePolicy: {
    coverRatio: '4:3',
    stepRatio: '16:9',
    coverWidth: 900,
    stepWidth: 720,
    quality: 72
  }
};

module.exports = config;
