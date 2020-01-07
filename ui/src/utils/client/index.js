import * as DashboardClient from '../dashboard_client';
import PDClient from '@pingcap-incubator/pd-client-js';

let DASHBOARD_API_URL_PERFIX = 'http://127.0.0.1:12333';
if (process.env.REACT_APP_DASHBOARD_API_URL !== undefined) {
  // Accept empty string as dashboard API URL as well.
  DASHBOARD_API_URL_PERFIX = process.env.REACT_APP_DASHBOARD_API_URL;
}

const DASHBOARD_API_URL = `${DASHBOARD_API_URL_PERFIX}/api`;

console.log(`Dashboard API URL: ${DASHBOARD_API_URL}`);

const dashboardClient = new DashboardClient.DefaultApi({
  basePath: DASHBOARD_API_URL,
});

// TODO: replace 'PD_API_BASE_URL' by real value
const pdClient = new PDClient({
  endpoint: 'PD_API_BASE_URL'
});

export default {
  dashboard: dashboardClient,
  pd: pdClient
};
