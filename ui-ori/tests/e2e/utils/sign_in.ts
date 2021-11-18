import { LOGIN_URL } from '../_config'

export async function do_sign_in() {
  await page.goto(LOGIN_URL)
  await page.waitForSelector('[data-e2e="signin_submit"]')

  await Promise.all([
    page.waitForNavigation(),
    page.click('[data-e2e="signin_submit"]'),
  ])
}
