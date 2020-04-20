import React from 'react'
import ReactDOM from 'react-dom'
import singleSpaReact from 'single-spa-react'
import * as singleSpa from 'single-spa'
import * as i18n from '@lib/utils/i18n'
import * as routing from '@dashboard/routing'

// TODO: This part might be better in TS.
export default class AppRegistry {
  constructor() {
    this.defaultRouter = ''
    this.apps = {}
  }

  static newReactSpaApp = function (rootComponentAsyncLoader, targetDomId) {
    const reactLifecycles = singleSpaReact({
      React,
      ReactDOM,
      loadRootComponent: async () => {
        const component = await rootComponentAsyncLoader()
        if (component.default) {
          return component.default
        }
        return component
      },
      domElementGetter: () => document.getElementById(targetDomId),
    })
    return {
      bootstrap: [reactLifecycles.bootstrap],
      mount: [reactLifecycles.mount],
      unmount: [reactLifecycles.unmount],
    }
  }

  /**
   * Register a TiDB Dashboard application.
   *
   * This function is a light encapsulation over single-spa's registerApplication
   * which provides some extra registry capabilities.
   *
   * @param {{
   *  id: string,
   *  reactRoot: Function,
   *  routerPrefix: string,
   *  indexRoute: string,
   *  isDefaultRouter: boolean,
   *  icon: string,
   * }} app
   */
  register(app) {
    if (app.translations) {
      i18n.addTranslations(app.translations)
    }

    singleSpa.registerApplication(
      app.id,
      AppRegistry.newReactSpaApp(app.reactRoot, '__spa_content__'),
      () => {
        return routing.isLocationMatchPrefix(app.routerPrefix)
      },
      {
        registry: this,
        app,
      }
    )
    if (!app.indexRoute) {
      app.indexRoute = app.routerPrefix
    }
    if (!this.defaultRouter || app.isDefaultRouter) {
      this.defaultRouter = app.indexRoute
    }
    this.apps[app.id] = app
    return this
  }

  /**
   * Get the default router for initial routing.
   */
  getDefaultRouter() {
    return this.defaultRouter || '/'
  }

  /**
   * Get the registry of the current active app.
   */
  getActiveApp() {
    const mountedApps = singleSpa.getMountedApps()
    for (let i = 0; i < mountedApps.length; i++) {
      const app = mountedApps[i]
      if (this.apps[app] !== undefined) {
        return this.apps[app]
      }
    }
  }
}
