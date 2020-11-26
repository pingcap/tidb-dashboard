import 'expect-puppeteer'
import { do_sign_in } from './utils/sign_in'
import { LOGIN_URL, OVERVIEW_URL } from './_config'

describe('Sign In', () => {
  it('should fail to sign in using incorrect password', async () => {
    await page.goto(LOGIN_URL)

    await expect(page).toFill(
      '[data-e2e="signin_password_input"]',
      'incorrect_password'
    )
    await expect(page).toClick('[data-e2e="signin_submit"]')
    await page.waitForFunction(
      `document
          .querySelector('[data-e2e="signin_password_form_item"]')
          .innerText
          .includes("TiDB authentication failed")`,
      { timeout: 5000 }
    )
  })

  it('should sign in using correct password', async () => {
    await do_sign_in()
    const url = await page.url()
    expect(url).toBe(OVERVIEW_URL)
  })
})
