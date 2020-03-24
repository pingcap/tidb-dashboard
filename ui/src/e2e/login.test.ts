import puppeteer from 'puppeteer'

// const LOGIN_URL = 'http://localhost:3000/#/signin'
const LOGIN_URL = process.env.CI
  ? 'http://127.0.0.1:12333/dashboard/#/signin'
  : 'http://localhost:3000/#/signin'

describe('Login', () => {
  // let browser
  // let page
  // beforeAll(async () => {
  //   // browser = await puppeteer.launch({
  //   //   headless: false,
  //   //   slowMo: 100,
  //   // })
  //   browser = await puppeteer.launch()
  //   page = await browser.newPage()
  // })

  // afterAll(() => {
  //   browser.close()
  // })

  it(
    'should login success by correct password',
    async () => {
      const browser = await puppeteer.launch()
      const page = await browser.newPage()

      await page.goto(LOGIN_URL)

      const title = await page.title()
      expect(title).toBe('TiDB Dashboard')

      await page.waitForSelector('button[type=submit]')
      await page.click('button[type=submit]')

      await page.waitForSelector('.ant-message-success')
      const success = await page.$eval('.ant-message-success', el =>
        el ? true : false
      )
      expect(success).toBe(true)
      const content = await page.$eval(
        '.ant-message-success span',
        el => el.textContent
      )
      expect(content).toEqual('Sign in successfully')

      // await page.screenshot({ path: 'screen-1.png' })

      await browser.close()
    },
    10 * 1000
  )

  it(
    'should login fail by incorrect password',
    async () => {
      const browser = await puppeteer.launch()
      const page = await browser.newPage()
      await page.goto(LOGIN_URL)

      await page.waitForSelector('input#tidb_signin_password')
      await page.type('input#tidb_signin_password', 'any')
      await page.click('button[type=submit]')

      await page.waitForSelector('.ant-form-explain')
      const fail = await page.$eval('.ant-form-explain', el =>
        el ? true : false
      )
      expect(fail).toBe(true)
      const content = await page.$eval(
        '.ant-form-explain',
        el => el.textContent
      )
      expect(content).toEqual('Sign in failed: TiDB authentication failed')

      // await page.screenshot({ path: 'screen-2.png' })

      await browser.close()
    },
    10 * 1000
  )
})
