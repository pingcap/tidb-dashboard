import React from 'react';
import { Menu, Icon } from 'antd';
import { Link } from 'react-router-dom';

import * as singleSpa from 'single-spa';
import * as LayoutSPA from '@/layout';
import './index.css';

import AppHome from '@/apps/home';
import AppDemo from '@/apps/demo';
import AppStatement from '@/apps/statement';

// TODO: This part might be better in TS.
class AppRegistry {
  constructor() {
    this.defaultRouter = '';
    this.apps = {};
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
   *  menuTitle: string,
   * }} app
   */
  register(app) {
    singleSpa.registerApplication(app.id, app.loader, (location) => {
      return location.hash.indexOf('#' + app.routerPrefix) === 0;
    });
    if (!app.indexRoute) {
      app.indexRoute = app.routerPrefix;
    }
    if (!this.defaultRouter || app.isDefaultRouter) {
      this.defaultRouter = app.indexRoute;
    }
    this.apps[app.id] = app;
    return this;
  }

  /**
   * Get the default router for initial routing.
   */
  getDefaultRouter() {
    return this.defaultRouter || '/';
  }

  /**
   * Get the registry of the current active app.
   */
  getActiveApp() {
    const mountedApps = singleSpa.getMountedApps();
    for (let i = 0; i < mountedApps.length; i++) {
      const app = mountedApps[i];
      if (this.apps[app] !== undefined) {
        return this.apps[app];
      }
    }
  }

  /**
   * Render an Antd menu item according to the app id.
   *
   * @param {string} appId
   */
  renderAppMenuItem(appId) {
    const app = this.apps[appId];
    if (!app) {
      return null;
    }
    return (
      <Menu.Item key={appId}>
        <Link to={app.indexRoute}>
          { app.icon ? <Icon type={app.icon} /> : null }
          <span>{app.menuTitle}</span>
        </Link>
      </Menu.Item>
    );
  }
}

const registry = new AppRegistry();

singleSpa.registerApplication('layout', LayoutSPA, () => true, { registry });
registry
  .register(AppHome)
  .register(AppDemo)
  .register(AppStatement)
;
singleSpa.start();

document.getElementById('dashboard_page_spinner').remove();
