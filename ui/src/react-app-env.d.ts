declare module '*.module.css' {
  const classes: { readonly [key: string]: string }
  export default classes
}

declare module '*.module.less' {
  const classes: { readonly [key: string]: string }
  export default classes
}

declare module '*.yaml' {
  const classes: { readonly [key: string]: string }
  export default classes
}

declare module '*.svg' {
  import * as React from 'react'

  const ReactComponent: React.SFC<React.SVGProps<SVGSVGElement>>
  export default ReactComponent
}

declare module '*.svgd' {
  const src: string
  export default src
}
