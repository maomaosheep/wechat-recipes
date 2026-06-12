const fs = require('fs');
const path = require('path');
const vm = require('vm');

const candidates = [
  { url: 'https://m.xiachufang.com/recipe/102203515/', category: 'dinner' },
  { url: 'https://m.xiachufang.com/recipe/100124682/', category: 'dinner' },
  { url: 'https://m.xiachufang.com/recipe/102205755/', category: 'lunch' },
  { url: 'https://m.xiachufang.com/recipe/106488658/', category: 'lunch' },
  { url: 'https://m.xiachufang.com/recipe/103885768/', category: 'dinner' },
  { url: 'https://m.xiachufang.com/recipe/101761223/', category: 'lunch' },
  { url: 'https://m.xiachufang.com/recipe/106880939/', category: 'dinner' }
];

const outRoot = path.join(__dirname, '..', 'resource', 'recipes');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function slugify(text) {
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function imageFromPattern(image, width = 900, height = 700) {
  const pattern = image && (image.url_pattern || image.urlPattern);
  if (!pattern) return '';
  return pattern
    .replace('{width}', String(width))
    .replace('{height}', String(height))
    .replace('{format}', 'jpg');
}

function cleanText(text) {
  return String(text || '')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseNuxt(html) {
  const match = html.match(/window\.__NUXT__=([\s\S]*?);<\/script>/);
  if (!match) return null;
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(`window.__NUXT__=${match[1]}`, context, { timeout: 1500 });
  return context.window.__NUXT__;
}

function normalizeRecipe(raw, category, sourceUrl) {
  if (!raw || !raw.name || !raw.image || !Array.isArray(raw.ingredients) || !Array.isArray(raw.instructions)) {
    return null;
  }

  const coverImage = imageFromPattern(raw.image, 1000, 760);
  const ingredients = raw.ingredients
    .map((item) => ({
      name: cleanText(item.name),
      amount: cleanText(item.amount || '适量')
    }))
    .filter((item) => item.name && item.amount);

  const steps = raw.instructions
    .map((item, index) => ({
      stepIndex: index + 1,
      stepText: cleanText(item.text),
      stepImage: imageFromPattern(item.image, 900, 650)
    }))
    .filter((item) => item.stepText && item.stepImage);

  if (!coverImage || !ingredients.length || !steps.length || steps.length !== raw.instructions.length) {
    return null;
  }

  const imageSet = new Set([coverImage, ...steps.map((item) => item.stepImage)]);
  if (imageSet.size !== steps.length + 1) return null;

  const id = `xcf-${raw.id || slugify(raw.name)}`;
  return {
    id,
    sourceName: '下厨房',
    sourceUrl,
    category,
    title: raw.name,
    coverImage,
    desc: cleanText(raw.desc || `${raw.name}的真实菜谱。`).slice(0, 120),
    cookTime: raw.duration || '见步骤',
    difficulty: raw.difficulty || '家常',
    ingredients,
    steps,
    recommended: true,
    updatedAt: Date.now()
  };
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      accept: 'text/html,application/xhtml+xml'
    }
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

async function download(url, filePath) {
  const res = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      referer: 'https://m.xiachufang.com/'
    }
  });
  if (!res.ok) throw new Error(`image ${res.status} ${url}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(filePath, buffer);
}

async function localizeImages(recipe) {
  const recipeDir = path.join(outRoot, recipe.id);
  ensureDir(recipeDir);

  const coverFile = path.join(recipeDir, 'cover.jpg');
  await download(recipe.coverImage, coverFile);
  recipe.coverImageRemote = recipe.coverImage;
  recipe.coverImage = `/resource/recipes/${recipe.id}/cover.jpg`;

  for (const step of recipe.steps) {
    const stepFile = path.join(recipeDir, `step-${String(step.stepIndex).padStart(2, '0')}.jpg`);
    await download(step.stepImage, stepFile);
    step.stepImageRemote = step.stepImage;
    step.stepImage = `/resource/recipes/${recipe.id}/step-${String(step.stepIndex).padStart(2, '0')}.jpg`;
  }

  fs.writeFileSync(path.join(recipeDir, 'recipe.json'), JSON.stringify(recipe, null, 2), 'utf8');
  return recipe;
}

async function main() {
  ensureDir(outRoot);
  const recipes = [];
  const skipped = [];

  for (const item of candidates) {
    try {
      const html = await fetchText(item.url);
      const nuxt = parseNuxt(html);
      const raw = nuxt && nuxt.data && nuxt.data[0] && nuxt.data[0].recipe;
      const recipe = normalizeRecipe(raw, item.category, item.url);
      if (!recipe) {
        skipped.push({ url: item.url, reason: 'missing complete recipe fields or unique images' });
        continue;
      }
      recipes.push(await localizeImages(recipe));
      console.log(`OK ${recipe.title} ${recipe.steps.length} steps`);
    } catch (err) {
      skipped.push({ url: item.url, reason: err.message });
      console.log(`SKIP ${item.url} ${err.message}`);
    }
  }

  fs.writeFileSync(path.join(outRoot, 'recipes.real.json'), JSON.stringify(recipes, null, 2), 'utf8');
  fs.writeFileSync(path.join(outRoot, 'skipped.json'), JSON.stringify(skipped, null, 2), 'utf8');
  console.log(`saved ${recipes.length}, skipped ${skipped.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
