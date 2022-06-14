import * as url from 'url'
import { AxiosInstance } from 'axios'
import * as Sentry from '@sentry/react'
import { stripQueryString } from './query'
import { Transaction } from '@sentry/types'

const transactionHub = new Map<string, Transaction>()

export const sentryEnabled = process.env.REACT_APP_SENTRY_ENABLED === 'true'

export function markStart(name: string, op?: string) {
  const transaction = Sentry.startTransaction({ name, op })
  transactionHub.set(transaction.name, transaction)
  transactionHub.set(transaction.traceId, transaction)
  return transaction
}

export function markEnd(name: string, traceId?: string) {
  const transaction = traceId
    ? transactionHub.get(traceId)
    : transactionHub.get(name)
  if (transaction) {
    transaction.finish()
    transactionHub.delete(name)
    if (traceId) {
      transactionHub.delete(traceId)
    }
  }
}

export function markTag(key: string, value: string | number, traceId: string) {
  const transaction = transactionHub.get(traceId)
  if (transaction) {
    transaction.setTag(key, value)
  }
}

export const reportError: typeof Sentry.captureException = (...args) => {
  if (sentryEnabled) {
    return Sentry.captureException(...args)
  }
  return ''
}

export function initSentryRoutingInstrument() {
  const firstMountTransaction = Sentry.startTransaction({ name: 'first mount' })

  window.addEventListener('single-spa:first-mount', () => {
    firstMountTransaction.finish()
  })

  window.addEventListener('single-spa:before-routing-event', (e: any) => {
    const { hash: newUrlHash } = url.parse(e.detail.newUrl)
    const { hash: oldUrlHash } = url.parse(e.detail.oldUrl)

    if (!newUrlHash) return

    const from = stripQueryString(oldUrlHash || '/')
    const to = stripQueryString(newUrlHash)
    const transaction = markStart(to, 'routing')
    transaction.setTag('routing.from', from)
    transaction.setTag('routing.to', to)
    transaction.setTag(
      'routing.mount',
      e.detail.appsByNewStatus.MOUNTED.join(',')
    )
    transaction.setTag(
      'routing.unmount',
      e.detail.appsByNewStatus.NOT_MOUNTED.join(',')
    )
  })

  window.addEventListener('single-spa:routing-event', (e: any) => {
    const { hash: newUrlHash } = url.parse(e.detail.newUrl)
    markEnd(stripQueryString(newUrlHash!))
  })
}

export function applySentryTracingInterceptor(instance: AxiosInstance) {
  instance.interceptors.request.use((config) => {
    if (config.url && config.method) {
      const { pathname } = url.parse(config.url)
      const transaction = markStart(pathname!, 'http')
      transaction.setTag('http.method', config.method.toUpperCase())
      config.headers!['x-sentry-trace'] = transaction.traceId
    }
    return config
  })

  instance.interceptors.response.use(
    (response) => {
      const id = response.config?.headers!['x-sentry-trace']
      if (id) {
        const { pathname } = url.parse(response.config.url!)
        markTag('http.status', response.status, id as string)
        markEnd(pathname!, id as string)
      }
      return response
    },
    (error) => {
      const id = error?.config?.headers['x-sentry-trace']
      if (id) {
        const { pathname } = url.parse(error.config.url)
        markTag(id, 'error', error.message)
        markEnd(pathname!, id)
      }

      return Promise.reject(error)
    }
  )
}
