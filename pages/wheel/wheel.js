const api = require('../../utils/api');
const favorite = require('../../utils/favorite');

const modes = [
  { id: 'all', name: '全部菜谱' },
  { id: 'personal', name: '收藏 / 自制' }
];

const colors = ['#ffe8df', '#ffd7dd', '#fff1c9', '#dcefe8', '#ffe2ef', '#f3e7d8'];

Page({
  data: {
    modes,
    activeMode: 'all',
    allRecipes: [],
    recipes: [],
    wheelItems: [],
    result: null,
    loading: true,
    spinning: false,
    spinText: '随机一个',
    emptyText: '',
    particlesEnabled: true,
    particleOptions: {
      count: 76,
      density: 'high',
      opacity: 0.62
    }
  },

  onLoad() {
    this.canvas = null;
    this.ctx = null;
    this.dpr = wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : wx.getSystemInfoSync().pixelRatio;
    this.size = 300;
    this.rotation = 0;
    this.rafId = null;
    this.loadRecipes();
  },

  onShow() {
    if (this.data.allRecipes.length) {
      this.applyMode(this.data.activeMode);
    }
  },

  onUnload() {
    if (this.rafId) {
      clearTimeout(this.rafId);
      this.rafId = null;
    }
  },

  async loadRecipes() {
    this.setData({ loading: true });

    try {
      const recipes = await api.listAllRecipes();
      const normalized = (recipes || []).map((item) => ({
        ...item,
        id: item.id || item._id,
        title: item.title || item.name || '未命名菜谱',
        cover: item.cover || item.coverImage || item.image,
        desc: item.desc || item.description || '一起做一道温暖的小菜。'
      }));

      this.setData({
        allRecipes: normalized,
        loading: false
      });
      this.applyMode(this.data.activeMode);
      this.initCanvas();
    } catch (err) {
      console.error('load wheel recipes failed', err);
      this.setData({
        loading: false,
        emptyText: '菜谱读取失败，请稍后再试'
      });
    }
  },

  switchMode(e) {
    if (this.data.spinning) return;
    this.applyMode(e.currentTarget.dataset.mode);
  },

  applyMode(mode) {
    let recipes = this.data.allRecipes;
    let emptyText = '还没有可抽取的菜谱';

    if (mode === 'personal') {
      const favoriteIds = favorite.getFavoriteIds();
      const selectedMap = {};

      this.data.allRecipes.forEach((item) => {
        const id = item.id || item._id;
        const isFavorite = favoriteIds.includes(id);
        const isCustom = item.isCustom || item.category === 'custom';
        if ((isFavorite || isCustom) && id) {
          selectedMap[id] = item;
        }
      });

      recipes = Object.keys(selectedMap).map((id) => selectedMap[id]);
      emptyText = '还没有收藏或自制菜谱';
    }

    const wheelItems = recipes.slice(0, 12);
    this.rotation = 0;
    this.setData({
      activeMode: mode,
      recipes,
      wheelItems,
      result: null,
      spinText: '随机一个',
      emptyText: wheelItems.length ? '' : emptyText
    });

    this.drawWheel(wheelItems);
  },

  initCanvas() {
    wx.createSelectorQuery()
      .in(this)
      .select('#wheelCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        const canvasInfo = res && res[0];
        if (!canvasInfo || !canvasInfo.node) return;

        this.canvas = canvasInfo.node;
        this.ctx = this.canvas.getContext('2d');
        this.size = canvasInfo.width || 300;
        this.canvas.width = this.size * this.dpr;
        this.canvas.height = this.size * this.dpr;
        this.ctx.scale(this.dpr, this.dpr);
        this.drawWheel();
      });
  },

  drawWheel(items = this.data.wheelItems) {
    if (!this.ctx) return;

    const ctx = this.ctx;
    const size = this.size;
    const center = size / 2;
    const radius = center - 4;

    ctx.clearRect(0, 0, size, size);

    if (!items.length) {
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#fff1ec';
      ctx.fill();
      ctx.fillStyle = '#d95b6b';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('等待菜谱', center, center);
      return;
    }

    const slice = (Math.PI * 2) / items.length;

    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(this.rotation);

    items.forEach((item, index) => {
      const start = index * slice;
      const end = start + slice;
      const title = item.title || item.name || '菜谱';

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, start, end);
      ctx.closePath();
      ctx.fillStyle = colors[index % colors.length];
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.94)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.save();
      ctx.rotate(start + slice / 2);
      ctx.fillStyle = '#5d4037';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(title.slice(0, 6), radius - 18, 0);
      ctx.restore();
    });

    ctx.beginPath();
    ctx.arc(0, 0, 58, 0, Math.PI * 2);
    ctx.fillStyle = '#fffaf7';
    ctx.shadowColor = 'rgba(216, 83, 108, 0.14)';
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.restore();
  },

  startSpin() {
    const items = this.data.wheelItems;
    if (this.data.spinning || !items.length) return;

    const pickedIndex = Math.floor(Math.random() * items.length);
    const slice = (Math.PI * 2) / items.length;
    const targetAngle = Math.PI * 1.5 - (pickedIndex * slice + slice / 2);
    const startRotation = this.rotation;
    const extraRounds = 6 + Math.floor(Math.random() * 3);
    const endRotation = targetAngle + Math.PI * 2 * extraRounds;
    const duration = 3800;
    const startTime = Date.now();

    this.setData({
      spinning: true,
      result: null,
      spinText: '挑选中...'
    });

    const easeOut = (t) => 1 - Math.pow(1 - t, 4);
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      this.rotation = startRotation + (endRotation - startRotation) * easeOut(progress);
      this.drawWheel(items);

      if (progress < 1) {
        this.rafId = setTimeout(animate, 16);
        return;
      }

      this.rotation = endRotation % (Math.PI * 2);
      this.drawWheel(items);
      this.setData({
        spinning: false,
        result: items[pickedIndex],
        spinText: '再随机一次'
      });
    };

    animate();
  },

  openResult() {
    const result = this.data.result;
    if (!result || !result.id) return;
    wx.navigateTo({
      url: `/pages/detail/detail?id=${result.id}`
    });
  }
});
