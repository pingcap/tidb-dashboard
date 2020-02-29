import i18n from 'i18next';
import axios from 'axios';
import { message } from 'antd';
import * as singleSpa from 'single-spa';
import * as DashboardClient from '@/utils/dashboard_client';
import * as authUtil from '@/utils/auth';
import * as routingUtil from '@/utils/routing';

let DASHBOARD_API_URL_PERFIX = 'http://127.0.0.1:12333';
if (process.env.REACT_APP_DASHBOARD_API_URL !== undefined) {
  // Accept empty string as dashboard API URL as well.
  DASHBOARD_API_URL_PERFIX = process.env.REACT_APP_DASHBOARD_API_URL;
}

export const DASHBOARD_API_URL = `${DASHBOARD_API_URL_PERFIX}/dashboard/api`;

console.log(`Dashboard API URL: ${DASHBOARD_API_URL}`);

axios.interceptors.response.use(undefined, function(err) {
  const { response } = err;
  // Handle unauthorized error in a unified way
  if (
    response &&
    response.data &&
    response.data.code === 'error.api.unauthorized'
  ) {
    if (
      !routingUtil.isLocationMatch('/') &&
      !routingUtil.isLocationMatchPrefix(authUtil.signInRoute)
    ) {
      message.error(i18n.t('error.message.unauthorized'));
    }
    authUtil.clearAuthToken();
    singleSpa.navigateToUrl('#' + authUtil.signInRoute);
    err.handled = true;
  } else if (err.message === 'Network Error') {
    message.error(i18n.t('error.message.network'));
    err.handled = true;
  }
  return Promise.reject(err);
});

const dashboardClient = new DashboardClient.DefaultApi({
  basePath: DASHBOARD_API_URL,
  apiKey: () => authUtil.getAuthTokenAsBearer(),
});

export default {
  basePath: DASHBOARD_API_URL,
  dashboard: dashboardClient,
};
