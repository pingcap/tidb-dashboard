const { paths } = require('react-app-rewired')
const { createProxyMiddleware } = require('http-proxy-middleware')

const dashboardApiPrefix =
  process.env.REACT_APP_DASHBOARD_API_URL || 'http://localhost:12333'

// The diagnose report will be served via WebpackDevServer.

// In debug mode, frontend host is localhost:3001, while the backend is 127.0.0.1:12333
// In production mode, frontend and backend host is the same
module.exports = function (app) {
  // Proxy the `data.js` trick to the backend server.
  // Proxy http://localhost:3001/dashboard/api/diagnose/reports/*/data.js to
  // http://127.0.0.1:12333/dashboard/api/diagnose/reports/*/data.js
  app.use(
    '/',
    createProxyMiddleware('/dashboard/api/diagnose/reports/*/data.js', {
      target: dashboardApiPrefix,
      changeOrigin: true,
    })
  )

  // Rewrite the webpage to our static HTML.
  // Rewrite http://localhost:3001/dashboard/api/diagnose/reports/*/detail
  // to http://localhost:3001/dashboard/diagnoseReport.html
  app.use('/dashboard/api/diagnose/reports/:id/detail', function (req, res) {
    req.url = paths.publicUrlOrPath + 'diagnoseReport.html'
    app.handle(req, res)
  })

  // Rewrite http://localhost:3001/dashboard/tool/dataviz
  // to http://localhost:3001/dashboard/dataviz.html
  app.use('/dashboard/tools/dataviz', function (req, res) {
    req.url = paths.publicUrlOrPath + 'dataViz.html'
    app.handle(req, res)
  })
}
