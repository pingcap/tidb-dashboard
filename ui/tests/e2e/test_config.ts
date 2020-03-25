export const URL_PREFIX = process.env.CI
  ? 'http://127.0.0.1:12333/dashboard/#/'
  : 'http://localhost:3000/#/'

export const LOGIN_URL = URL_PREFIX + 'sigin'
export const OVERVIEW_URL = URL_PREFIX + 'overview'

export const PUPPETEER_CONFIG = process.env.CI
  ? undefined
  : {
      headless: false,
      slowMo: 80,
    }
