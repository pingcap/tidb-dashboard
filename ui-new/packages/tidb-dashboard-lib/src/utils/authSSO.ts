import client, { ErrorStrategy } from '@lib/client'
import { Modal } from 'antd'
import * as auth from './auth'
import { AuthTypes } from './auth'

function newRandomString(length: number) {
  let text = ''
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }
  return text
}

function getBaseURL() {
  return `${window.location.protocol}//${window.location.host}${window.location.pathname}`
}

function getRedirectURL() {
  return `${getBaseURL()}?sso_callback=1`
}

export async function getAuthURL() {
  const codeVerifier = newRandomString(128)
  const state = newRandomString(32)

  sessionStorage.setItem('sso.codeVerifier', codeVerifier)
  sessionStorage.setItem('sso.state', state)
  const resp = await client
    .getInstance()
    .userSSOGetAuthURL(codeVerifier, getRedirectURL(), state)
  return resp.data
}

export function isSSOCallback() {
  const p = new URLSearchParams(window.location.search)
  return p.has('sso_callback')
}

async function handleSSOCallbackInner() {
  const p = new URLSearchParams(window.location.search)
  if (p.get('state') !== sessionStorage.getItem('sso.state')) {
    throw new Error(
      'Invalid OIDC state: You may see this error when your SSO sign in is outdated.'
    )
  }
  const r = await client.getInstance().userLogin(
    {
      type: AuthTypes.SSO,
      extra: JSON.stringify({
        code: p.get('code'),
        code_verifier: sessionStorage.getItem('sso.codeVerifier'),
        redirect_url: getRedirectURL()
      })
    },
    { errorStrategy: ErrorStrategy.Custom }
  )

  sessionStorage.removeItem('sso.codeVerifier')
  sessionStorage.removeItem('sso.state')

  auth.setAuthToken(r.data.token)
  window.location.replace(getBaseURL())
}

export async function handleSSOCallback() {
  try {
    await handleSSOCallbackInner()
  } catch (e) {
    Modal.error({
      title: 'SSO Sign In Failed',
      content: '' + e,
      okText: 'Sign In Again',
      onOk: () => window.location.replace(getBaseURL())
    })
  }
}
