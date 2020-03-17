# @pingcap-incubator/statement

>

[![NPM](https://img.shields.io/npm/v/@pingcap-incubator/statement.svg)](https://www.npmjs.com/package/@pingcap-incubator/statement) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## Install

```bash
npm install --save @pingcap-incubator/statement
```

## Usage

```tsx
import React from 'react'
import { HashRouter as Router } from 'react-router-dom'
import { StatementsOverviewPage } from '@pingcap-incubator/statement'
import * as DashboardClient from '@pingcap-incubator/dashboard_client'

const dashboardClient = new DashboardClient.DefaultApi({
  basePath: 'http://127.0.0.1:12333/dashboard/api',
  apiKey: 'xxx',
})

const App = () => (
  <Router>
    <div style={{ margin: 12 }}>
      <StatementsOverviewPage
        dashboardClient={dashboardClient}
        detailPagePath="/statement/detail"
      />
    </div>
  </Router>
)

export default App
```

More usage, see [demo](https://github.com/baurine/test-tidb-dashboard-packages)

## License

© [@pingcap-incubator](https://github.com/pingcap-incubator)
