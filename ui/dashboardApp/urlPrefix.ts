let publicPathPrefix =
  document
    .querySelector('meta[name=x-dashboard-prefix]')
    ?.getAttribute('content') || '/dashboard'
if (publicPathPrefix === '__DASHBOARD_PREFIX__') {
  publicPathPrefix = '/dashboard'
}

export default publicPathPrefix
