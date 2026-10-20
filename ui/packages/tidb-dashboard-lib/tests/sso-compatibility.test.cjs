// Copyright 2026 PingCAP, Inc.

const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const test = require('node:test')
const { compileFunction } = require('node:vm')
const { transformSync } = require('esbuild')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')

function loadSource(path, overrides = {}) {
  const compiled = { exports: {} }
  const source = readFileSync(join(__dirname, '../src', path), 'utf8')
  compileFunction(
    transformSync(source, { loader: 'tsx', format: 'cjs' }).code,
    ['require', 'module', 'exports']
  )((name) => overrides[name] || require(name), compiled, compiled.exports)
  return compiled.exports
}

const storeModule = loadSource('utils/store.ts')
const profileData = { config: undefined, impersonations: undefined }
const dataSource = {
  userSSOGetConfig: () => {},
  userSSOListImpersonations: () => {}
}
const { SSOForm } = loadSource('apps/UserProfile/components/Form.SSO.tsx', {
  '@lib/components': {
    AnimatedSkeleton: ({ children }) => children,
    ErrorBar: () => null
  },
  '@lib/utils/store': storeModule,
  '@lib/utils/useChange': { useChange: React.useEffect },
  '@lib/utils/useClientRequest': {
    useClientRequest: (request) => ({
      isLoading: false,
      data:
        request === dataSource.userSSOGetConfig
          ? profileData.config
          : profileData.impersonations
    })
  },
  'react-i18next': { useTranslation: () => ({ t: (key) => key }) },
  '../context': { UserProfileContext: React.createContext({ ds: dataSource }) }
})

test('legacy server shows an upgrade requirement and disables SSO controls', () => {
  storeModule.store.update((s) => {
    s.whoAmI = { display_name: 'root', is_writeable: true }
  })
  const html = renderToStaticMarkup(React.createElement(SSOForm))
  assert.match(html, /user_profile.sso.form.upgrade_required/)
  assert.match(html, /<button[^>]*role="switch"[^>]*disabled/)
})

test('a supported server distinguishes denied management from a legacy server', () => {
  storeModule.store.update((s) => {
    s.whoAmI = {
      display_name: 'alice@example.com',
      is_writeable: true,
      can_manage_sso: false
    }
  })
  const html = renderToStaticMarkup(React.createElement(SSOForm))
  assert.doesNotMatch(html, /user_profile.sso.form.upgrade_required/)
  assert.match(html, /<button[^>]*role="switch"[^>]*disabled/)
})

test('a supported direct SQL session can manage SSO', () => {
  storeModule.store.update((s) => {
    s.whoAmI = {
      display_name: 'root',
      is_writeable: true,
      can_manage_sso: true
    }
  })
  const html = renderToStaticMarkup(React.createElement(SSOForm))
  assert.doesNotMatch(html, /user_profile.sso.form.upgrade_required/)
  assert.doesNotMatch(html, /<button[^>]*role="switch"[^>]*disabled/)
})

test('saved authorization shows success and failure states beside its SQL user', () => {
  storeModule.store.update((s) => {
    s.whoAmI = {
      display_name: 'operator',
      is_writeable: true,
      can_manage_sso: true
    }
  })
  try {
    for (const [status, message, style] of [
      [null, 'ok', 'success'],
      ['success', 'ok', 'success'],
      ['auth_fail', 'auth_failed', 'danger'],
      ['insufficient_privileges', 'insufficient_privileges', 'danger']
    ]) {
      profileData.impersonations = [
        { sql_user: 'delegated-user', last_impersonate_status: status }
      ]
      const html = renderToStaticMarkup(React.createElement(SSOForm))
      assert.match(html, /user_profile.sso.form.authorization_status/)
      assert.match(html, /delegated-user/)
      assert.ok(
        html.includes(`user_profile.sso.form.user.authn_status.${message}`),
        `authorization status ${status} must show ${message}`
      )
      assert.match(html, new RegExp(`ant-typography-${style}`))
      assert.match(html, /user_profile.sso.form.reauthorize/)
    }
    profileData.impersonations = []
    const html = renderToStaticMarkup(React.createElement(SSOForm))
    assert.doesNotMatch(html, /user_profile.sso.form.authorization_status/)
    assert.doesNotMatch(html, /user_profile.sso.form.user.authn_status.ok/)
  } finally {
    profileData.impersonations = undefined
  }
})
