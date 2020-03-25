import puppeteer from 'puppeteer'
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

      await page.goto(LOGIN_URL)

      // login
      const loginBtn = await page.waitForSelector('button#signin_btn')
      await loginBtn.click()

      // jump to search logs page
      const searchLogsLink = await page.waitForSelector(
        'a[href="#/search_logs"]'
      )
      await searchLogsLink.click()

      // find search form
      const searchForm = await page.waitForSelector('form[name="search_form"]')

      // set log level to INFO
      const logLevelSelector = await searchForm.$('div#log_level_selector')
      await logLevelSelector.click()
      const logLevelLists = await page.waitForSelector(
        'div.ant-select-dropdown ul[role=listbox]'
      )
      const logLevels = await logLevelLists.$$eval('li[role=option]', (nodes) =>
        nodes.map((n) => n.innerText)
      )
      expect(logLevels).toEqual([
        'DEBUG',
        'INFO',
        'WARN',
        'TRACE',
        'CRITICAL',
        'ERROR',
      ])

      const infoNode = await logLevelLists.$('li[role=option]:nth-child(2)')
      await infoNode.click()

      // select TiDB component
      const componentSelector = await searchForm.$(
        'div.ant-form-item:nth-child(4)'
      )
      await componentSelector.click()
      const componentsTree = await page.waitForSelector('ul.ant-select-tree')
      const tidbComponent = await componentsTree.$('span[title="TiDB"]')
      await tidbComponent.click()

      // start search
      const searchBtn = await searchForm.$(
        'div.ant-form-item:nth-child(5) button[type="submit"]'
      )
      await searchBtn.click()

      // check result
      const logsTable = await page.waitForSelector('table')
      const content = await logsTable.$eval('tbody', (node) => node.innerText)
      expect(content).toContain('Welcome to TiDB')
      expect(content.includes('Welcome to TiKV')).toBe(false)
    },
    10 * 1000
  )
})
