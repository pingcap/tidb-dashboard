let dashboardPrefix =
  document
    .querySelector('meta[name=x-dashboard-prefix]')
    ?.getAttribute('content') || '/dashboard'
if (dashboardPrefix === '__DASHBOARD_PREFIX__') {
  dashboardPrefix = '/dashboard'
}

export { dashboardPrefix }
