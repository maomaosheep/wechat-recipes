const stepImages = {
  prep: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=720&q=72',
  chop: 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=720&q=72',
  pan: 'https://images.unsplash.com/photo-1514986888952-8cd320577b68?auto=format&fit=crop&w=720&q=72',
  plate: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=720&q=72',
  bake: 'https://images.unsplash.com/photo-1483695028939-5bb13f8648b0?auto=format&fit=crop&w=720&q=72',
  dessert: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=720&q=72'
};

const recipes = [
  {
    id: 'breakfast-toast',
    category: 'breakfast',
    title: '草莓云朵吐司',
    name: '草莓云朵吐司',
    cover: 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?auto=format&fit=crop&w=900&q=72',
    image: 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?auto=format&fit=crop&w=900&q=72',
    desc: '柔软吐司配草莓和酸奶，适合一起慢慢醒来的早晨。',
    time: '12 分钟',
    recommended: true,
    materials: ['厚吐司 2 片', '草莓 8 颗', '希腊酸奶 120g', '蜂蜜 1 勺', '薄荷叶 少许'],
    steps: [
      { text: '吐司放入烤箱或平底锅，小火烤到边缘微脆。', image: stepImages.bake },
      { text: '草莓洗净切片，酸奶拌入蜂蜜调成轻盈抹酱。', image: stepImages.chop },
      { text: '把酸奶抹在吐司上，错落铺上草莓片。', image: stepImages.prep },
      { text: '点缀薄荷叶，趁温热切开分享。', image: stepImages.plate }
    ]
  },
  {
    id: 'breakfast-omelet',
    category: 'breakfast',
    title: '爱心芝士蛋卷',
    name: '爱心芝士蛋卷',
    cover: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=900&q=72',
    image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=900&q=72',
    desc: '嫩蛋包住融化芝士，切开就是小小仪式感。',
    time: '15 分钟',
    recommended: true,
    materials: ['鸡蛋 3 个', '牛奶 30ml', '芝士片 1 片', '黄油 8g', '盐 少许'],
    steps: [
      { text: '鸡蛋加牛奶和盐打散，过滤一次口感更细。', image: stepImages.prep },
      { text: '平底锅小火融化黄油，倒入蛋液慢慢推熟。', image: stepImages.pan },
      { text: '蛋液半凝固时放芝士片，从一侧轻轻卷起。', image: stepImages.chop },
      { text: '切成小段，用番茄酱画一个小心形。', image: stepImages.plate }
    ]
  },
  {
    id: 'lunch-rice',
    category: 'lunch',
    title: '番茄牛肉拥抱饭',
    name: '番茄牛肉拥抱饭',
    cover: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?auto=format&fit=crop&w=900&q=72',
    image: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?auto=format&fit=crop&w=900&q=72',
    desc: '酸甜浓汁盖在热米饭上，忙碌午间也能被照顾。',
    time: '35 分钟',
    recommended: true,
    materials: ['牛肉片 180g', '番茄 2 个', '洋葱 半个', '米饭 2 碗', '生抽 1 勺'],
    steps: [
      { text: '牛肉片用生抽、黑胡椒和少量淀粉腌 10 分钟。', image: stepImages.prep },
      { text: '洋葱切丝，番茄切块，准备一碗热米饭。', image: stepImages.chop },
      { text: '锅中炒香洋葱和番茄，煮出浓厚番茄汁。', image: stepImages.pan },
      { text: '放入牛肉煮熟，浇在米饭上即可。', image: stepImages.plate }
    ]
  },
  {
    id: 'lunch-salad',
    category: 'lunch',
    title: '柠檬鸡胸暖沙拉',
    name: '柠檬鸡胸暖沙拉',
    cover: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=900&q=72',
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=900&q=72',
    desc: '清爽但不寡淡，适合想吃轻一点的两个人。',
    time: '25 分钟',
    recommended: false,
    materials: ['鸡胸肉 1 块', '生菜 1 把', '小番茄 8 颗', '玉米粒 60g', '柠檬 半个'],
    steps: [
      { text: '鸡胸肉用盐、黑胡椒和柠檬汁腌 8 分钟。', image: stepImages.prep },
      { text: '蔬菜洗净沥干，小番茄对半切开。', image: stepImages.chop },
      { text: '鸡胸肉两面煎熟，静置 3 分钟后切片。', image: stepImages.pan },
      { text: '蔬菜和酱汁拌匀，最后铺上鸡胸肉。', image: stepImages.plate }
    ]
  },
  {
    id: 'dinner-pasta',
    category: 'dinner',
    title: '奶油蘑菇约会意面',
    name: '奶油蘑菇约会意面',
    cover: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=900&q=72',
    image: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=900&q=72',
    desc: '香气温柔的晚餐，配电影刚刚好。',
    time: '28 分钟',
    recommended: true,
    materials: ['意面 180g', '口蘑 8 个', '淡奶油 120ml', '蒜 2 瓣', '黑胡椒 少许'],
    steps: [
      { text: '意面加盐煮到八九分熟，留半碗煮面水。', image: stepImages.prep },
      { text: '口蘑切片，蒜切末，准备淡奶油。', image: stepImages.chop },
      { text: '蒜末和蘑菇炒香，倒入淡奶油和煮面水。', image: stepImages.pan },
      { text: '加入意面拌匀，撒黑胡椒装盘。', image: stepImages.plate }
    ]
  },
  {
    id: 'dinner-soup',
    category: 'dinner',
    title: '南瓜浓汤小月亮',
    name: '南瓜浓汤小月亮',
    cover: 'https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?auto=format&fit=crop&w=900&q=72',
    image: 'https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?auto=format&fit=crop&w=900&q=72',
    desc: '绵密南瓜汤，暖胃也暖心。',
    time: '32 分钟',
    recommended: false,
    materials: ['南瓜 400g', '牛奶 180ml', '洋葱 1/4 个', '黄油 10g', '盐 少许'],
    steps: [
      { text: '南瓜去皮切块，蒸到筷子可以轻松戳透。', image: stepImages.chop },
      { text: '黄油炒香洋葱碎，加入南瓜块翻炒。', image: stepImages.pan },
      { text: '倒入牛奶，小火煮开后搅打细腻。', image: stepImages.prep },
      { text: '调盐后装碗，可点少量奶油做纹路。', image: stepImages.plate }
    ]
  },
  {
    id: 'dessert-pudding',
    category: 'dessert',
    title: '焦糖布丁告白杯',
    name: '焦糖布丁告白杯',
    cover: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=72',
    image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=72',
    desc: '滑嫩布丁和焦糖香，是饭后的小甜句。',
    time: '50 分钟',
    recommended: true,
    materials: ['鸡蛋 2 个', '牛奶 250ml', '细砂糖 45g', '热水 1 勺'],
    steps: [
      { text: '一半细砂糖小火熬成焦糖，倒入杯底。', image: stepImages.dessert },
      { text: '鸡蛋、牛奶和剩余糖搅匀后过滤。', image: stepImages.prep },
      { text: '倒入杯中，盖锡纸后水浴蒸或烤熟。', image: stepImages.bake },
      { text: '冷藏后倒扣，淋一点焦糖液。', image: stepImages.plate }
    ]
  },
  {
    id: 'dessert-mousse',
    category: 'dessert',
    title: '桃桃酸奶慕斯',
    name: '桃桃酸奶慕斯',
    cover: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=900&q=72',
    image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=900&q=72',
    desc: '粉粉嫩嫩、轻盈不腻，适合纪念日。',
    time: '2 小时',
    recommended: false,
    materials: ['水蜜桃 1 个', '酸奶 200g', '淡奶油 120g', '吉利丁片 8g', '饼干碎 60g'],
    steps: [
      { text: '饼干碎压在杯底，冷藏定型 10 分钟。', image: stepImages.dessert },
      { text: '桃肉打成果泥，吉利丁泡软后融化。', image: stepImages.chop },
      { text: '酸奶、桃泥、吉利丁和打发淡奶油拌匀。', image: stepImages.prep },
      { text: '倒入杯中冷藏凝固，表面放桃丁。', image: stepImages.plate }
    ]
  },
  {
    id: 'breakfast-pancake',
    category: 'breakfast',
    title: '蜂蜜松饼塔',
    name: '蜂蜜松饼塔',
    cover: 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=900&q=72',
    image: 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=900&q=72',
    desc: '松软层层叠起，适合周末慢早餐。',
    time: '22 分钟',
    recommended: true,
    materials: ['低筋面粉 120g', '鸡蛋 1 个', '牛奶 130ml', '泡打粉 4g', '蜂蜜 适量'],
    steps: [
      { text: '面粉、泡打粉混合，加入鸡蛋和牛奶搅成面糊。', image: stepImages.prep },
      { text: '平底锅小火预热，不放油倒入一勺面糊。', image: stepImages.pan },
      { text: '表面冒小泡后翻面，再煎 40 秒。', image: stepImages.bake },
      { text: '松饼叠高，淋蜂蜜并放水果。', image: stepImages.plate }
    ]
  },
  {
    id: 'lunch-curry',
    category: 'lunch',
    title: '椰香咖喱鸡饭',
    name: '椰香咖喱鸡饭',
    cover: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=72',
    image: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=72',
    desc: '浓郁但温柔，一锅就能解决午餐。',
    time: '36 分钟',
    recommended: false,
    materials: ['鸡腿肉 250g', '土豆 1 个', '胡萝卜 半根', '咖喱块 2 块', '椰浆 100ml'],
    steps: [
      { text: '鸡腿肉切块，土豆和胡萝卜切滚刀块。', image: stepImages.chop },
      { text: '鸡肉煎到表面微黄，加入蔬菜翻炒。', image: stepImages.pan },
      { text: '加水没过食材，煮软后放咖喱块。', image: stepImages.prep },
      { text: '倒入椰浆收浓，盖在米饭上。', image: stepImages.plate }
    ]
  },
  {
    id: 'dinner-salmon',
    category: 'dinner',
    title: '柠檬黄油煎三文鱼',
    name: '柠檬黄油煎三文鱼',
    cover: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=900&q=72',
    image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=900&q=72',
    desc: '外皮微脆、内里柔嫩，晚餐高级但不复杂。',
    time: '24 分钟',
    recommended: true,
    materials: ['三文鱼 2 块', '黄油 12g', '柠檬 半个', '芦笋 6 根', '海盐 少许'],
    steps: [
      { text: '三文鱼擦干水分，用海盐和黑胡椒腌 8 分钟。', image: stepImages.prep },
      { text: '芦笋去老根，柠檬切片备用。', image: stepImages.chop },
      { text: '锅中融化黄油，鱼皮朝下煎到微脆。', image: stepImages.pan },
      { text: '挤柠檬汁，搭配芦笋装盘。', image: stepImages.plate }
    ]
  },
  {
    id: 'dessert-tiramisu',
    category: 'dessert',
    title: '轻盈提拉米苏杯',
    name: '轻盈提拉米苏杯',
    cover: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=900&q=72',
    image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=900&q=72',
    desc: '咖啡香和奶油层次，是约会饭后的经典收尾。',
    time: '3 小时',
    recommended: true,
    materials: ['手指饼干 8 根', '马斯卡彭 180g', '淡奶油 120g', '咖啡液 80ml', '可可粉 适量'],
    steps: [
      { text: '淡奶油打发，和马斯卡彭轻轻拌匀。', image: stepImages.prep },
      { text: '手指饼干快速蘸咖啡液，铺入杯底。', image: stepImages.dessert },
      { text: '一层饼干一层奶油，重复堆叠。', image: stepImages.plate },
      { text: '冷藏 3 小时，吃前筛可可粉。', image: stepImages.dessert }
    ]
  }
];

const banners = [
  {
    id: 'banner-pasta',
    image: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=1200&q=72',
    recipeId: 'dinner-pasta',
    title: '今晚做一道约会意面',
    sort: 1
  },
  {
    id: 'banner-toast',
    image: 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?auto=format&fit=crop&w=1200&q=72',
    recipeId: 'breakfast-toast',
    title: '把早晨变甜一点',
    sort: 2
  },
  {
    id: 'banner-salmon',
    image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=1200&q=72',
    recipeId: 'dinner-salmon',
    title: '高级感晚餐也可以很简单',
    sort: 3
  }
];

const categories = [
  { id: 'all', name: '全部', icon: '♡' },
  { id: 'breakfast', name: '早餐', icon: '☀' },
  { id: 'lunch', name: '午餐', icon: '◐' },
  { id: 'dinner', name: '晚餐', icon: '☾' },
  { id: 'dessert', name: '甜点', icon: '✦' },
  { id: 'custom', name: '自制', icon: '+' }
];

module.exports = {
  recipes,
  banners,
  categories
};
