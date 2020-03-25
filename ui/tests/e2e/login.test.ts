import puppeteer from 'puppeteer'
import { URL_PREFIX, PUPPETEER_CONFIG } from './test_config'

const LOGIN_URL = `${URL_PREFIX}/signin`

describe('Login', () => {
  let browser
  beforeAll(async () => {
    browser = await puppeteer.launch(PUPPETEER_CONFIG)
  })

  afterAll(() => {
    browser.close()
  })

  it(
    'should login success by correct password',
    async () => {
      const page = await browser.newPage()

      await page.goto(LOGIN_URL)

      const title = await page.title()
      expect(title).toBe('TiDB Dashboard')

      await page.waitForSelector('button[type=submit]')
      await page.click('button[type=submit]')

      await page.waitForSelector('.ant-message-success')
      const success = await page.$eval('.ant-message-success', (el) =>
        el ? true : false
      )
      expect(success).toBe(true)
      const content = await page.$eval(
        '.ant-message-success span',
        (el) => el.textContent
      )
      expect(content).toEqual('Sign in successfully')

      // await page.screenshot({ path: 'screen-1.png' })
    },
    10 * 1000
  )

  it(
    'should login fail by incorrect password',
    async () => {
      const page = await browser.newPage()
      await page.goto(LOGIN_URL)

      await page.waitForSelector('input#tidb_signin_password')
      await page.type('input#tidb_signin_password', 'any')
      await page.click('button[type=submit]')

      await page.waitForSelector('.ant-form-explain')
      const fail = await page.$eval('.ant-form-explain', (el) =>
        el ? true : false
      )
      expect(fail).toBe(true)
      const content = await page.$eval(
        '.ant-form-explain',
        (el) => el.textContent
      )
      expect(content).toEqual('Sign in failed: TiDB authentication failed')

      // await page.screenshot({ path: 'screen-2.png' })
    },
    10 * 1000
  )
})
