import { Modal } from 'antd';
import * as singleSpa from 'single-spa';
import AppRegistry from '@/utils/registry';
import * as routingUtil from '@/utils/routing';
import * as authUtil from '@/utils/auth';
import i18n from '@/utils/i18n';
import client from '@/utils/client';

import * as LayoutMain from '@/layout';
import * as LayoutSignIn from '@/layout/signin';
import AppKeyVis from '@/apps/keyvis';
import AppHome from '@/apps/home';
import AppDemo from '@/apps/demo';
import AppStatement from '@/apps/statement';

async function main() {
  const registry = new AppRegistry();

  singleSpa.registerApplication(
    'layout',
    LayoutMain,
    () => {
      return !routingUtil.isLocationMatchPrefix(authUtil.signInRoute);
    },
    { registry }
  );

  singleSpa.registerApplication(
    'signin',
    LayoutSignIn,
    () => {
      return routingUtil.isLocationMatchPrefix(authUtil.signInRoute);
    },
    { registry }
  );

  i18n.loadResource({
    en: require('@/layout/translations/en.yaml'),
    zh_CN: require('@/layout/translations/zh_CN.yaml'),
  });

  registry
    .register(AppKeyVis)
    .register(AppHome)
    .register(AppDemo)
    .register(AppStatement)
    .finish();

  try {
    console.log(await client.dashboard.getInfo());
    if (routingUtil.isLocationMatch('/')) {
      singleSpa.navigateToUrl('#' + registry.getDefaultRouter());
    }
  } catch (e) {
    console.error(e);
    if (!e.handled) {
      Modal.error({
        title: 'Oops',
        content: 'Failure: ' + e.message,
        okText: 'Reload',
        onOk() {
          window.location.reload();
        },
      });
    }
  }

  window.addEventListener('single-spa:app-change', () => {
    if (!routingUtil.isLocationMatchPrefix(authUtil.signInRoute)) {
      if (!authUtil.getAuthTokenAsBearer()) {
        singleSpa.navigateToUrl('#' + authUtil.signInRoute);
        return;
      }
    }
  });

  singleSpa.start();
  document.getElementById('dashboard_page_spinner').remove();
}

main();
