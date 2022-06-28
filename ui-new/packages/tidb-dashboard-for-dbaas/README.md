# TiDB Dashboard for DBaaS

NPM: [@pingcap/tidb-dashboard-for-dbaas](https://www.npmjs.com/package/@pingcap/tidb-dashboard-for-dbaas)

## How to Use

See example: [test-cdn/index.html](./public/test-cdn/index.html)

```html
<!DOCTYPE html>
<html>
  <head>
    // ...
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/@pingcap/tidb-dashboard-for-dbaas@<version>/dist/main.css"
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module">
      import { default as startDashboard } from 'https://cdn.jsdelivr.net/npm/@pingcap/tidb-dashboard-for-dbaas@<version>/dist/main.js'

      // get tidb dashboard api path base and token
      // ...

      // startDashboard by apiPathBase and token
      startDashboard(apiPathBase, token)
    </script>
  </body>
</html>
```
