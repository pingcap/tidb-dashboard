import puppeteer from 'puppeteer'
import { LOGIN_URL, OVERVIEW_URL, PUPPETEER_CONFIG } from './test_config'

describe('Login', () => {
  let browser
  beforeAll(async () => {
    browser = await puppeteer.launch(PUPPETEER_CONFIG)
  })

  afterAll(() => {
    browser.close()
  })

  it(
    'should login fail by incorrect password',
    async () => {
      const page = await browser.newPage()
      await page.goto(LOGIN_URL)

      const pwdInput = await page.waitForSelector('input#tidb_signin_password')
      await pwdInput.type('any')
      await page.click('button#signin_btn')

      const errorContainer = await page.waitForSelector('div.has-error')
      const containsPwdInput = await errorContainer.$eval(
        'input#tidb_signin_password',
        (el) => (el ? true : false)
      )
      expect(containsPwdInput).toBe(true)
      const errorContent = await errorContainer.$eval(
        '.ant-form-explain',
        (el) => el.textContent
      )
      expect(errorContent).toContain('TiDB authentication failed')
    },
    10 * 1000
  )

  it(
    'should login success by correct password',
    async () => {
      const page = await browser.newPage()

      await page.goto(LOGIN_URL)

      const title = await page.title()
      expect(title).toBe('TiDB Dashboard')

      const loginBtn = await page.waitForSelector('button#signin_btn')
      await Promise.all([page.waitForNavigation(), loginBtn.click()])
      const url = await page.url()
      expect(url).toBe(OVERVIEW_URL)
    },
    10 * 1000
  )
})
