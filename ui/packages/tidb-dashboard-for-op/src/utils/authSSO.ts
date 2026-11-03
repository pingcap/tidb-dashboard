import { Modal } from 'antd'
import { ReqConfig } from '@pingcap/tidb-dashboard-lib'
import client from '~/client'
import { AuthTypes, setAuthToken } from './auth'

function newRandomString(length: number) {
  const bytes = new Uint8Array(Math.ceil(length / 2))
  window.crypto.getRandomValues(bytes)
  // Hex is PKCE-compatible and preserves the existing parameter lengths.
  return Array.from(bytes, (byte) => ('0' + byte.toString(16)).slice(-2))
    .join('')
    .slice(0, length)
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
    .userSSOGetAuthURL({ codeVerifier, redirectUrl: getRedirectURL(), state })
  return resp.data
}

export function isSSOCallback() {
  const p = new URLSearchParams(window.location.search)
  return p.has('sso_callback')
}

async function handleSSOCallbackInner() {
  const p = new URLSearchParams(window.location.search)
  const state = p.get('state')
  const expectedState = sessionStorage.getItem('sso.state')
  const code = p.get('code')
  const codeVerifier = sessionStorage.getItem('sso.codeVerifier')
  if (!state || !expectedState || state !== expectedState) {
    throw new Error(
      'Invalid OIDC state: You may see this error when your SSO sign in is outdated.'
    )
  }
  if (!code || !codeVerifier) {
    throw new Error(
      'Invalid OIDC callback: Missing authorization code or PKCE verifier. Please sign in again.'
    )
  }
  const r = await client.getInstance().userLogin(
    {
      message: {
        type: AuthTypes.SSO,
        extra: JSON.stringify({
          code,
          code_verifier: codeVerifier,
          redirect_url: getRedirectURL()
        })
      }
    },
    { handleError: 'custom' } as ReqConfig
  )

  sessionStorage.removeItem('sso.codeVerifier')
  sessionStorage.removeItem('sso.state')

  setAuthToken(r.data.token)
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
