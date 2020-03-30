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
      await ppExpect(page).toClick('a#search_logs')

      // find search form
      const searchForm = await page.waitForSelector('form#search_form')

      // set log level to INFO
      await ppExpect(searchForm).toClick('#log_level_selector')
      await ppExpect(page).toClick('div[data-e2e="level_info"]')

      // select TiDB component
      await ppExpect(searchForm).toClick('div[data-e2e="components_selector"]')
      // components selector dropdown is a DOM node with absolute position
      // and its parent is body, failed to add id or data-e2e to it
      await ppExpect(page).toClick('span[title="TiDB"]')

      // start search
      await ppExpect(searchForm).toClick('button#search_btn')

      // check search result
      const logsTable = await page.waitForSelector('#logs_result table tbody')
      const content = await logsTable.evaluate((node) => node.innerText)
      expect(content).toContain('Welcome to TiDB')
      expect(content.includes('Welcome to TiKV')).toBe(false)

      // TODO: test download
    },
    10 * 1000
  )
})
