import puppeteer from 'puppeteer'
import ppExpect from 'expect-puppeteer'
import { LOGIN_URL, PUPPETEER_CONFIG } from './test_config'

describe('Search Logs', () => {
  let browser
  beforeAll(async () => {
    browser = await puppeteer.launch(PUPPETEER_CONFIG)
  })

  afterAll(() => {
    browser.close()
  })

  it(
    'should search correct logs',
    async () => {
      const page = await browser.newPage()

      // login
      await page.goto(LOGIN_URL)
      await ppExpect(page).toClick('button#signin_btn')

      // jump to search logs page
      await ppExpect(page).toClick('a[href="#/search_logs"]')

      // find search form
      const searchForm = await page.waitForSelector('form[name="search_form"]')

      // set log level to INFO
      await ppExpect(searchForm).toClick('div#log_level_selector')
      const logLevelLists = await page.waitForSelector('ul[role=listbox]')
      await ppExpect(logLevelLists).toClick('li', { text: 'INFO' })

      // select TiDB component
      await ppExpect(searchForm).toClick('div:nth-child(4)')
      await ppExpect(page).toClick('ul[role=tree] span[title="TiDB"]')

      // start search
      await ppExpect(searchForm).toClick('button', { text: 'Search' })

      // check search result
      const logsTable = await page.waitForSelector('table tbody')
      await ppExpect(logsTable).toMatch('Welcome to TiDB')
      const content = await logsTable.evaluate((node) => node.innerText)
      expect(content.includes('Welcome to TiKV')).toBe(false)

      // TODO: test download
    },
    10 * 1000
  )
})
