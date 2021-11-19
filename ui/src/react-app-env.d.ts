/// <reference types="react-scripts" />

declare module '*.module.css' {
  const classes: { readonly [key: string]: string }
  export default classes
}

declare module '*.module.less' {
  const classes: { readonly [key: string]: string }
  export default classes
}

declare module '*.yaml' {
  const content: {
    [key: string]: any
  }
  export default content
}

// need to comment the svg declare in the ui/node_modules/react-scripts/lib/react-app.d.ts
declare module '*.svg' {
  import * as React from 'react'

  const ReactComponent: React.SFC<React.SVGProps<SVGSVGElement>>
  export default ReactComponent
}

declare module '*.svgd' {
  const src: string
  export default src
}
