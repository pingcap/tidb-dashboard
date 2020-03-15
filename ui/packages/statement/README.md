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
import client from '@/utils/client'

const App = () => (
  <Router>
    <div style={{ margin: 12 }}>
      <StatementsOverviewPage
        dashboardClient={client.dashboard}
        detailPagePath="/statement/detail"
      />
    </div>
  </Router>
)

export default App
```

## License

© [@pingcap-incubator](https://github.com/pingcap-incubator)
