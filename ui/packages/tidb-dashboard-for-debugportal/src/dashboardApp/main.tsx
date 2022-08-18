import React from 'react'

import * as singleSpa from 'single-spa'
import i18next from 'i18next'
import { Modal, notification } from 'antd'
import NProgress from 'nprogress'
import './nprogress.less'

import {
  routing,
  i18n,
  // telemetry
  telemetry,
  // store
  NgmState,
  // distro
  distro,
  isDistro
} from '@pingcap/tidb-dashboard-lib'

import { InfoInfoResponse, setupClient } from '~/client'
import auth from '~/uilts/auth'
import { mustLoadAppInfo, reloadWhoAmI } from '~/uilts/store'
import { AppOptions } from '~/uilts/appOptions'
import AppRegistry from '~/uilts/registry'

import AppOverview from '~/apps/Overview/meta'
import AppMonitoring from '~/apps/Monitoring/meta'
import AppClusterInfo from '~/apps/ClusterInfo/meta'
import AppTopSQL from '~/apps/TopSQL/meta'
import AppSlowQuery from '~/apps/SlowQuery/meta'
import AppStatement from '~/apps/Statement/meta'
import AppKeyViz from '~/apps/KeyViz/meta'
import AppSystemReport from '~/apps/SystemReport/meta'
import AppSearchLogs from '~/apps/SearchLogs/meta'
import AppInstanceProfiling from '~/apps/InstanceProfiling/meta'
import AppConProfiling from '~/apps/ContinuousProfiling/meta'
import AppDebugAPI from '~/apps/DebugAPI/meta'
import AppQueryEditor from '~/apps/QueryEditor/meta'
import AppConfiguration from '~/apps/Configuration/meta'
import AppUserProfile from '~/apps/UserProfile/meta'
import AppDiagnose from '~/apps/Diagnose/meta'
import AppOptimizerTrace from '~/apps/OptimizerTrace/meta'
import AppDeadlock from '~/apps/Deadlock/meta'

import LayoutMain from './layout/main'
import LayoutSignIn from './layout/signin'

import translations from './layout/translations'

// for update distro strings resource
// import '~/uilts/distro/stringsRes'

function removeSpinner() {
  const spinner = document.getElementById('dashboard_page_spinner')
  if (spinner) {
    spinner.remove()
  }
}

async function webPageStart() {
  let info: InfoInfoResponse

  try {
    info = await mustLoadAppInfo()
  } catch (e) {
    Modal.error({
      title: `Failed to connect to server`,
      content: '' + e,
      okText: 'Reload',
      onOk: () => window.location.reload()
    })
    removeSpinner()
    return
  }

  telemetry.init(
    process.env.REACT_APP_MIXPANEL_HOST,
    process.env.REACT_APP_MIXPANEL_TOKEN
  )
  if (info?.enable_telemetry) {
    // mixpanel
    telemetry.enable(info.version?.internal_version!)
    let preRoute = ''
    window.addEventListener('single-spa:routing-event', () => {
      const curRoute = routing.getPathInLocationHash()
      if (curRoute !== preRoute) {
        telemetry.trackRouteChange(curRoute)
        preRoute = curRoute
      }
    })
  }

  const options: AppOptions = {
    lang: 'en',
    skipNgmCheck: false,
    hideNav: false
  }
  if (!options.skipNgmCheck && info?.ngm_state === NgmState.NotStarted) {
    notification.error({
      key: 'ngm_not_started',
      message: i18next.t('health_check.failed_notification_title'),
      description: (
        <span>
          {i18next.t('health_check.ngm_not_started')}
          {!isDistro() && (
            <>
              {' '}
              <a
                href={i18next.t('health_check.help_url')}
                target="_blank"
                rel="noopener noreferrer"
              >
                {i18next.t('health_check.help_text')}
              </a>
            </>
          )}
        </span>
      ),
      duration: null
    })
  }

  const registry = new AppRegistry(options)

  NProgress.configure({
    showSpinner: false
  })
  window.addEventListener('single-spa:before-routing-event', () => {
    NProgress.set(0.2)
  })
  window.addEventListener('single-spa:routing-event', () => {
    NProgress.done(true)
  })

  singleSpa.registerApplication(
    'layout',
    AppRegistry.newReactSpaApp(() => LayoutMain, 'root'),
    () => {
      return !routing.isSignInPage()
    },
    { registry }
  )

  singleSpa.registerApplication(
    'signin',
    AppRegistry.newReactSpaApp(() => LayoutSignIn, 'root'),
    () => {
      return routing.isSignInPage()
    },
    { registry }
  )

  registry
    .register(AppUserProfile)
    .register(AppOverview)
    .register(AppClusterInfo)
    .register(AppKeyViz)
    .register(AppTopSQL)
    .register(AppStatement)
    .register(AppSystemReport)
    .register(AppSlowQuery)
    .register(AppDiagnose)
    .register(AppMonitoring)
    .register(AppSearchLogs)
    .register(AppInstanceProfiling)
    .register(AppConProfiling)
    .register(AppQueryEditor)
    .register(AppConfiguration)
    .register(AppDebugAPI)
    .register(AppOptimizerTrace)
    .register(AppDeadlock)

  try {
    const ok = await reloadWhoAmI()

    if (routing.isLocationMatch('/') && ok) {
      singleSpa.navigateToUrl('#' + registry.getDefaultRouter())
    }
  } catch (e) {
    // If there are auth errors, redirection will happen any way. So we continue.
  }

  window.addEventListener('single-spa:app-change', () => {
    if (!routing.isSignInPage()) {
      if (!auth.getAuthTokenAsBearer()) {
        singleSpa.navigateToUrl('#' + routing.signInRoute)
      }
    }
  })

  window.addEventListener('single-spa:first-mount', () => {
    removeSpinner()
  })

  singleSpa.start()
}

function main() {
  document.title = `${distro().tidb} Dashboard`

  function handleSameWindowPortalEvent(event) {
    const { type, token, apiBasePath, orgId, clusterId } = event.detail
    // the event type must be "DASHBOARD_PORTAL_EVENT"
    if (type !== 'DASHBOARD_PORTAL_EVENT') {
      return
    }

    i18next.changeLanguage('en')
    i18n.addTranslations(translations)
    setupClient(apiBasePath, token, orgId, clusterId)

    window.removeEventListener(
      'dashboard:portal_event',
      handleSameWindowPortalEvent
    )

    webPageStart()
  }
  window.addEventListener('dashboard:portal_event', handleSameWindowPortalEvent)
}

main()
