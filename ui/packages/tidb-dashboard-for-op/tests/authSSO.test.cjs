// Copyright 2026 PingCAP, Inc.

const assert = require('node:assert/strict')
const { webcrypto } = require('node:crypto')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const test = require('node:test')
const { runInNewContext } = require('node:vm')
const { transformSync } = require('esbuild')

const source = readFileSync(join(__dirname, '../src/utils/authSSO.ts'), 'utf8')
const compiled = transformSync(source, { loader: 'ts', format: 'cjs' }).code

function loadSSO({ search = '', stored = {}, login, crypto = webcrypto } = {}) {
  const storage = new Map(Object.entries(stored))
  const calls = {
    logins: [],
    authURLs: [],
    tokens: [],
    redirects: [],
    errors: []
  }
  const client = {
    userSSOGetAuthURL: async (params) => {
      calls.authURLs.push(params)
      return { data: 'https://idp.example/authorize' }
    },
    userLogin: async (...args) => {
      calls.logins.push(args)
      return login ? login(...args) : { data: { token: 'session-token' } }
    }
  }
  const mod = { exports: {} }
  runInNewContext(compiled, {
    module: mod,
    exports: mod.exports,
    require: (name) => {
      if (name === 'antd') {
        return { Modal: { error: (options) => calls.errors.push(options) } }
      }
      if (name === '~/client') return { getInstance: () => client }
      if (name === './auth') {
        return {
          AuthTypes: { SSO: 2 },
          setAuthToken: (token) => calls.tokens.push(token)
        }
      }
      throw new Error(`Unexpected dependency: ${name}`)
    },
    URLSearchParams,
    window: {
      crypto,
      location: {
        protocol: 'https:',
        host: 'dashboard.example',
        pathname: '/custom/dashboard/',
        search,
        replace: (url) => calls.redirects.push(url)
      }
    },
    sessionStorage: {
      getItem: (key) => (storage.has(key) ? storage.get(key) : null),
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key)
    },
    Math: Object.assign(Object.create(Math), {
      random: () => {
        throw new Error('SSO must not fall back to Math.random')
      }
    })
  })
  return { api: mod.exports, calls, storage }
}

test('SSO initiation uses Web Crypto with compatible parameter lengths', async () => {
  const { api, calls, storage } = loadSSO()
  assert.equal(await api.getAuthURL(), 'https://idp.example/authorize')
  const first = calls.authURLs[0]
  assert.equal(first.codeVerifier.length, 128)
  assert.match(first.codeVerifier, /^[A-Za-z0-9._~-]+$/)
  assert.equal(first.state.length, 32)
  assert.equal(storage.get('sso.codeVerifier'), first.codeVerifier)
  assert.equal(storage.get('sso.state'), first.state)
  assert.equal(
    first.redirectUrl,
    'https://dashboard.example/custom/dashboard/?sso_callback=1'
  )
  await api.getAuthURL()
  assert.notEqual(calls.authURLs[1].codeVerifier, first.codeVerifier)
  assert.notEqual(calls.authURLs[1].state, first.state)
})

test('random source failure stops initiation without an insecure fallback', async () => {
  const { api, calls, storage } = loadSSO({
    crypto: {
      getRandomValues: () => {
        throw new Error('random source unavailable')
      }
    }
  })
  await assert.rejects(api.getAuthURL(), /random source unavailable/)
  assert.equal(calls.authURLs.length, 0)
  assert.equal(storage.size, 0)
})

test('valid callbacks retain the API shape, including pending legacy logins', async () => {
  const verifier = 'aA0zZ9'.repeat(21) + 'ab'
  const { api, calls, storage } = loadSSO({
    search: '?sso_callback=1&state=legacy-state&code=issued-code',
    stored: {
      'sso.state': 'legacy-state',
      'sso.codeVerifier': verifier,
      unrelated: 'keep'
    }
  })
  await api.handleSSOCallback()
  assert.equal(calls.logins.length, 1)
  const [request, options] = calls.logins[0]
  assert.equal(request.message.type, 2)
  assert.deepEqual(JSON.parse(request.message.extra), {
    code: 'issued-code',
    code_verifier: verifier,
    redirect_url: 'https://dashboard.example/custom/dashboard/?sso_callback=1'
  })
  assert.equal(options.handleError, 'custom')
  assert.deepEqual(calls.tokens, ['session-token'])
  assert.deepEqual(calls.redirects, [
    'https://dashboard.example/custom/dashboard/'
  ])
  assert.equal(calls.errors.length, 0)
  assert.equal(storage.has('sso.state'), false)
  assert.equal(storage.has('sso.codeVerifier'), false)
  assert.equal(storage.get('unrelated'), 'keep')
  await api.handleSSOCallback()
  assert.equal(
    calls.logins.length,
    1,
    'a completed callback must not be resubmitted'
  )
})

for (const { name, search, stored } of [
  {
    name: 'both states absent',
    search: '?sso_callback=1&code=code',
    stored: {}
  },
  {
    name: 'both states empty',
    search: '?sso_callback=1&state=&code=code',
    stored: { 'sso.state': '', 'sso.codeVerifier': 'verifier' }
  },
  {
    name: 'stored state absent',
    search: '?sso_callback=1&state=state&code=code',
    stored: { 'sso.codeVerifier': 'verifier' }
  },
  {
    name: 'callback state absent during a pending login',
    search: '?sso_callback=1&code=code',
    stored: { 'sso.state': 'state', 'sso.codeVerifier': 'verifier' }
  },
  {
    name: 'state mismatch',
    search: '?sso_callback=1&state=attacker-state&code=code',
    stored: { 'sso.state': 'state', 'sso.codeVerifier': 'verifier' }
  },
  {
    name: 'code absent',
    search: '?sso_callback=1&state=state',
    stored: { 'sso.state': 'state', 'sso.codeVerifier': 'verifier' }
  },
  {
    name: 'code empty',
    search: '?sso_callback=1&state=state&code=',
    stored: { 'sso.state': 'state', 'sso.codeVerifier': 'verifier' }
  },
  {
    name: 'verifier absent',
    search: '?sso_callback=1&state=state&code=code',
    stored: { 'sso.state': 'state' }
  },
  {
    name: 'verifier empty',
    search: '?sso_callback=1&state=state&code=code',
    stored: { 'sso.state': 'state', 'sso.codeVerifier': '' }
  }
]) {
  test(`invalid callback rejects ${name} before login`, async () => {
    const { api, calls } = loadSSO({ search, stored })
    await api.handleSSOCallback()
    assert.equal(calls.logins.length, 0)
    assert.equal(calls.tokens.length, 0)
    assert.equal(calls.errors.length, 1)
    const error = calls.errors[0]
    assert.equal(error.title, 'SSO Sign In Failed')
    assert.equal(error.okText, 'Sign In Again')
    error.onOk()
    assert.deepEqual(calls.redirects, [
      'https://dashboard.example/custom/dashboard/'
    ])
  })
}

test('a failed exchange retains pending state and allows the existing retry flow', async () => {
  let attempts = 0
  const { api, calls, storage } = loadSSO({
    search: '?sso_callback=1&state=state&code=code',
    stored: { 'sso.state': 'state', 'sso.codeVerifier': 'verifier' },
    login: () => {
      if (++attempts === 1) throw new Error('temporary exchange failure')
      return { data: { token: 'retried-token' } }
    }
  })
  await api.handleSSOCallback()
  assert.equal(storage.get('sso.state'), 'state')
  assert.equal(storage.get('sso.codeVerifier'), 'verifier')
  assert.equal(calls.tokens.length, 0)
  assert.equal(calls.redirects.length, 0)
  assert.match(calls.errors[0].content, /temporary exchange failure/)
  await api.handleSSOCallback()
  assert.equal(calls.logins.length, 2)
  assert.deepEqual(calls.tokens, ['retried-token'])
  assert.equal(storage.has('sso.state'), false)
  assert.equal(storage.has('sso.codeVerifier'), false)
})
