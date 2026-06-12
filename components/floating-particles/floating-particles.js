Component({
  properties: {
    enabled: {
      type: Boolean,
      value: true,
      observer(value) {
        if (value) {
          this.start();
        } else {
          this.stop();
        }
      }
    },
    count: {
      type: Number,
      value: 54
    },
    density: {
      type: String,
      value: 'normal'
    },
    opacity: {
      type: Number,
      value: 0.42
    }
  },

  data: {},

  lifetimes: {
    attached() {
      this.app = getApp();
      this.canvas = null;
      this.ctx = null;
      this.dpr = 1;
      this.width = 0;
      this.height = 0;
      this.particles = [];
      this.rafId = 0;
      this.running = false;
      this.lastTime = 0;
    },

    ready() {
      this.initCanvas();
    },

    detached() {
      this.stop();
      this.saveSharedState();
      this.ctx = null;
      this.canvas = null;
    }
  },

  pageLifetimes: {
    show() {
      if (this.properties.enabled) this.start();
    },
    hide() {
      this.stop();
    }
  },

  methods: {
    initCanvas() {
      const query = this.createSelectorQuery();
      query
        .select('#particleCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          const canvasInfo = res && res[0];
          if (!canvasInfo || !canvasInfo.node) return;

          const systemInfo = wx.getSystemInfoSync();
          const canvas = canvasInfo.node;
          const ctx = canvas.getContext('2d');
          const dpr = systemInfo.pixelRatio || 1;

          this.canvas = canvas;
          this.ctx = ctx;
          this.dpr = dpr;
          this.width = canvasInfo.width || systemInfo.windowWidth;
          this.height = canvasInfo.height || systemInfo.windowHeight;
          canvas.width = this.width * dpr;
          canvas.height = this.height * dpr;
          ctx.scale(dpr, dpr);

          this.restoreOrCreateParticles();
          this.start();
        });
    },

    getParticleCount() {
      const base = this.properties.count;
      const level = this.properties.density;
      if (level === 'low') return Math.max(22, Math.floor(base * 0.58));
      if (level === 'high') return Math.min(90, Math.floor(base * 1.25));
      return base;
    },

    createParticles() {
      const total = this.getParticleCount();
      this.particles = Array.from({ length: total }, () => this.createParticle(true));
    },

    restoreOrCreateParticles() {
      const store = this.getStore();
      const total = this.getParticleCount();
      if (store.particles && store.particles.length) {
        this.particles = store.particles.map((item) => ({ ...item }));
        this.normalizeParticleCount(total);
        this.fastForward((Date.now() - (store.updatedAt || Date.now())) / 1000);
        return;
      }
      this.createParticles();
      this.saveSharedState();
    },

    normalizeParticleCount(total) {
      while (this.particles.length < total) {
        this.particles.push(this.createParticle(false));
      }
      if (this.particles.length > total) {
        this.particles = this.particles.slice(0, total);
      }
    },

    fastForward(seconds) {
      const capped = Math.max(0, Math.min(seconds, 2.5));
      if (!capped) return;
      this.update(capped);
    },

    getStore() {
      if (!this.app.globalData.floatingParticles) {
        this.app.globalData.floatingParticles = {
          particles: [],
          updatedAt: Date.now()
        };
      }
      return this.app.globalData.floatingParticles;
    },

    saveSharedState() {
      if (!this.app || !this.particles) return;
      const store = this.getStore();
      store.particles = this.particles.map((item) => ({ ...item }));
      store.updatedAt = Date.now();
    },

    createParticle(initial) {
      const size = this.random(8, 28);
      const y = initial ? this.random(0, this.height) : this.height + this.random(8, 80);
      const shapePool = ['heart', 'star', 'cat', 'dot', 'dot'];
      return {
        x: this.random(0, this.width),
        y,
        size,
        speed: this.random(12, 42),
        drift: this.random(8, 28),
        phase: this.random(0, Math.PI * 2),
        rotate: this.random(-0.45, 0.45),
        rotateSpeed: this.random(-0.18, 0.18),
        alpha: this.random(0.28, this.properties.opacity),
        shape: shapePool[Math.floor(this.random(0, shapePool.length))],
        color: this.pickColor()
      };
    },

    pickColor() {
      const colors = [
        'rgba(255, 182, 193, 1)',
        'rgba(255, 150, 178, 1)',
        'rgba(255, 205, 218, 1)',
        'rgba(244, 139, 173, 1)',
        'rgba(255, 228, 234, 1)'
      ];
      return colors[Math.floor(this.random(0, colors.length))];
    },

    start() {
      if (!this.canvas || this.running || !this.properties.enabled) return;
      this.running = true;
      this.lastTime = Date.now();
      this.tick();
    },

    stop() {
      this.saveSharedState();
      this.running = false;
      if (this.rafId && this.canvas) {
        this.canvas.cancelAnimationFrame(this.rafId);
      }
      this.rafId = 0;
    },

    tick() {
      if (!this.running || !this.canvas || !this.ctx) return;

      const now = Date.now();
      const delta = Math.min(32, now - this.lastTime) / 1000;
      this.lastTime = now;
      this.update(delta);
      this.draw();
      this.rafId = this.canvas.requestAnimationFrame(() => this.tick());
    },

    update(delta) {
      const topLimit = -42;
      this.particles.forEach((particle, index) => {
        particle.y -= particle.speed * delta;
        particle.phase += delta * 1.25;
        particle.rotate += particle.rotateSpeed * delta;
        particle.renderX = particle.x + Math.sin(particle.phase) * particle.drift;

        if (particle.y < topLimit || particle.renderX < -60 || particle.renderX > this.width + 60) {
          this.particles[index] = this.createParticle(false);
        }
      });
    },

    draw() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.width, this.height);

      this.particles.forEach((particle) => {
        const progress = 1 - Math.max(0, Math.min(1, particle.y / this.height));
        const fade = particle.alpha * (1 - progress * 0.58);
        ctx.save();
        ctx.globalAlpha = Math.max(0.03, fade);
        ctx.translate(particle.renderX || particle.x, particle.y);
        ctx.rotate(particle.rotate);
        ctx.fillStyle = particle.color;
        ctx.strokeStyle = particle.color;
        this.drawShape(ctx, particle);
        ctx.restore();
      });
    },

    drawShape(ctx, particle) {
      if (particle.shape === 'heart') {
        this.drawHeart(ctx, particle.size);
        return;
      }
      if (particle.shape === 'star') {
        this.drawStar(ctx, particle.size);
        return;
      }
      if (particle.shape === 'cat') {
        this.drawCat(ctx, particle.size);
        return;
      }
      ctx.beginPath();
      ctx.arc(0, 0, particle.size * 0.42, 0, Math.PI * 2);
      ctx.fill();
    },

    drawHeart(ctx, size) {
      const s = size / 24;
      ctx.beginPath();
      ctx.moveTo(0, 7 * s);
      ctx.bezierCurveTo(-13 * s, -3 * s, -10 * s, -15 * s, 0, -8 * s);
      ctx.bezierCurveTo(10 * s, -15 * s, 13 * s, -3 * s, 0, 7 * s);
      ctx.fill();
    },

    drawStar(ctx, size) {
      const outer = size * 0.5;
      const inner = outer * 0.48;
      ctx.beginPath();
      for (let i = 0; i < 10; i += 1) {
        const radius = i % 2 === 0 ? outer : inner;
        const angle = -Math.PI / 2 + (i * Math.PI) / 5;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    },

    drawCat(ctx, size) {
      const r = size * 0.42;
      ctx.beginPath();
      ctx.moveTo(-r * 0.82, -r * 0.28);
      ctx.lineTo(-r * 0.45, -r * 1.1);
      ctx.lineTo(-r * 0.08, -r * 0.48);
      ctx.lineTo(r * 0.08, -r * 0.48);
      ctx.lineTo(r * 0.45, -r * 1.1);
      ctx.lineTo(r * 0.82, -r * 0.28);
      ctx.arc(0, 0, r, -0.42, Math.PI + 0.42, false);
      ctx.closePath();
      ctx.fill();
    },

    random(min, max) {
      return min + Math.random() * (max - min);
    }
  }
});
