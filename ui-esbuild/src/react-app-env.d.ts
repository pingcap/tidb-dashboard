/// <reference types="react-scripts" />

declare module '*.module.css' {
  const classes: { readonly [key: string]: string }
  export default classes
}

declare module '*.module.less' {
  const classes: { readonly [key: string]: string }
  export default classes
}

declare module '*.svg' {
  const content: any
  export default content
}

// .yaml and .yml declarations
declare module '*.yaml' {
  const content: {
    [key: string]: any
  }
  export default content
}
