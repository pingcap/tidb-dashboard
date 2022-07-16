# TiDB Dashboard for DBaaS

NPM: [@pingcap/tidb-dashboard-for-dbaas](https://www.npmjs.com/package/@pingcap/tidb-dashboard-for-dbaas)

## How to Use

```html
<!DOCTYPE html>
<html>
  <head>
    <!-- ... -->
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/@pingcap/tidb-dashboard-for-dbaas@<version>/dist/main.css"
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module">
      import startDashboard from 'https://cdn.jsdelivr.net/npm/@pingcap/tidb-dashboard-for-dbaas@<version>/dist/main.js'

      // get tidb dashboard api path base and api token
      // ...

      // startDashboard by apiPathBase and apiToken
      startDashboard({ apiPathBase, apiToken })
    </script>
  </body>
</html>
```
