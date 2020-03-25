const URL_PREFIX = process.env.CI
  ? 'http://127.0.0.1:12333/dashboard/#'
  : 'http://localhost:3000/#'

const PUPPETEER_CONFIG = process.env.CI
  ? undefined
  : {
      headless: false,
      slowMo: 80,
    }

export { URL_PREFIX, PUPPETEER_CONFIG }
