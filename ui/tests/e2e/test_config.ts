export let SERVER_URL = `${
  process.env.SERVER_URL || 'http://localhost:3001/dashboard'
}#`
export const LOGIN_URL = SERVER_URL + '/signin'
export const OVERVIEW_URL = SERVER_URL + '/overview'

export const PUPPETEER_CONFIG = process.env.CI
  ? undefined
  : {
      headless: false,
      slowMo: 80,
    }
