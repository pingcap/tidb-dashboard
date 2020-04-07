import * as singleSpa from 'single-spa'
import * as i18nUtil from '@/utils/i18n'
import * as routingUtil from '@/utils/routing'

// TODO: This part might be better in TS.
export default class AppRegistry {
  constructor() {
    this.defaultRouter = ''
    this.apps = {}
  }

  /**
   * Register a TiDB Dashboard application.
   *
   * This function is a light encapsulation over single-spa's registerApplication
   * which provides some extra registry capabilities.
   *
   * @param {{
   *  id: string,
   *  loader: Function,
   *  routerPrefix: string,
   *  indexRoute: string,
   *  isDefaultRouter: boolean,
   *  icon: string,
   * }} app
   */
  register(app) {
    if (app.translations) {
      i18nUtil.addTranslations(app.translations)
    }

    singleSpa.registerApplication(
      app.id,
      app.loader,
      () => {
        return routingUtil.isLocationMatchPrefix(app.routerPrefix)
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
