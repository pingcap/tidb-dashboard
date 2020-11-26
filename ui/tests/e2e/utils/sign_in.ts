import { LOGIN_URL } from '../_config'

export async function do_sign_in() {
  await page.goto(LOGIN_URL)

  await Promise.all([
    page.waitForNavigation(),
    page.click('[data-e2e="signin_submit"]'),
  ])
}
