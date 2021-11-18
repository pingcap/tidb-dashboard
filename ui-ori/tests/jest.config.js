module.exports = {
  preset: './e2e/_preset.js',
  setupFilesAfterEnv: ['expect-puppeteer', './e2e/_setup.js'],
}
