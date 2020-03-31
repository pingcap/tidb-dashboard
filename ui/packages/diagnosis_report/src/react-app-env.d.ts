/// <reference types="react-scripts" />

// https://stackoverflow.com/questions/12709074/how-do-you-explicitly-set-a-new-property-on-window-in-typescript
interface Window {
  __diagnosis_data__: any
}

declare module '*.yaml' {
  const content: any
  export default content
}
