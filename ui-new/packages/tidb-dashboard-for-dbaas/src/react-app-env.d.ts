declare module '*.yaml' {
  const classes: { readonly [key: string]: string }
  export default classes
}
