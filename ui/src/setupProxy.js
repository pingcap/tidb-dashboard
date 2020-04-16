const { paths } = require('react-app-rewired')
const { createProxyMiddleware } = require('http-proxy-middleware')

const dashboardApiPrefix =
  process.env.REACT_APP_DASHBOARD_API_URL || 'http://127.0.0.1:12333'

// The diagnose report will be served via WebpackDevServer.

module.exports = function (app) {
  // Proxy the `data.js` trick to the backend server.
  app.use(
    '/',
    createProxyMiddleware('/dashboard/api/diagnose/reports/*/data.js', {
      target: dashboardApiPrefix,
      changeOrigin: true,
    })
  )

  // Rewrite the webpage to our static HTML.
  app.use('/dashboard/api/diagnose/reports/:id/detail', function (req, res) {
    req.url = paths.publicUrlOrPath + 'diagnoseReport.html'
    app.handle(req, res)
  })
}
