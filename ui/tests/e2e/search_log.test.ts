import 'expect-puppeteer'
import { do_sign_in } from './utils/sign_in'

describe('Search Logs', () => {
  it(
    'should search correct logs',
    async () => {
      await do_sign_in()

      await Promise.all([page.waitForNavigation(), page.click('a#search_logs')])

      // FIXME: should be integrated with ngm
      await page.click('.ant-notification-close-x')

      // Fill keyword
      await expect(page).toFill('[data-e2e="log_search_keywords"]', 'Welcome')

      // Deselect PD instance
      await page.click('[data-e2e="log_search_instances"]')
      await expect(page).toClick(
        '[data-e2e="log_search_instances_drop"] .ms-GroupHeader-title',
        {
          text: 'PD',
        }
      )
      await page.click('[data-e2e="log_search_instances"]')

      // Start search
      await page.click('[data-e2e="log_search_submit"]')

      await page.waitForSelector('[data-e2e="log_search_result"]')
      await page.waitForFunction(
        `document
            .querySelector('[data-e2e="log_search_result"]')
            .innerText
            .includes("Welcome to TiDB")`,
        { timeout: 5000 }
      )
    },
    30 * 1000
  )
})
