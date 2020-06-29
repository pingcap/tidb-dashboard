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
      await page.waitForSelector('a#search_logs')
      const searchLogsLink = await page.$('a#search_logs')
      await searchLogsLink.click()

      // this fails randomly and high possibility, says can't find "a#search_logs" element
      // await ppExpect(page).toClick('a#search_logs')

      // find search form
      const searchForm = await page.waitForSelector('form#search_form')

      // choose time range
      await ppExpect(searchForm).toClick(
        'button[data-e2e="timerange-selector"]'
      )
      const secondsOf4weeks = 28 * 24 * 60 * 60
      await ppExpect(page).toClick(
        `div[data-e2e="common-timeranges"] div[data-e2e="timerange-${secondsOf4weeks}"]`
      )
      // to hide dropdown
      await ppExpect(searchForm).toClick(
        'button[data-e2e="timerange-selector"]'
      )

      // set log level to INFO
      await ppExpect(searchForm).toClick('#logLevel')
      await ppExpect(page).toClick('div[data-e2e="level_2"]')

      // select TiDB component
      // https://stackoverflow.com/questions/59882543/how-to-wait-for-a-button-to-be-enabled-and-click-with-puppeteer
      await page.waitForSelector('div#instances input:not([disabled])')
      await ppExpect(searchForm).toClick('div#instances')
      // components selector dropdown is a DOM node with absolute position
      // and its parent is body, failed to add id or data-e2e to it
      // cancel select PD and TiKV, and only remain TiDB
      await ppExpect(page).toClick('div[data-e2e="table-with-filter"] span', {
        text: 'PD',
      })
      await ppExpect(page).toClick('div[data-e2e="table-with-filter"] span', {
        text: 'TiKV',
      })
      // to hide dropdown
      await ppExpect(searchForm).toClick('div#instances')

      // start search
      await ppExpect(searchForm).toClick('button#search_btn')

      // check search result
      let logsTable = await page.waitForSelector(
        'div[data-e2e="search-result"] div[role="presentation"]:first-child'
      )
      const url = await page.url()
      console.log('current url:', url)
      let content = await logsTable.evaluate((node) => node.innerText)
      console.log(content)

      logsTable = await page.waitForSelector(
        'div[data-e2e="search-result"] div[role="presentation"]:last-child'
      )
      content = await logsTable.evaluate((node) => node.innerText)
      expect(content).toContain('Welcome to TiDB')
      expect(content.includes('Welcome to TiKV')).toBe(false)
    },
    25 * 1000
  )
})
