/// <reference types="mocha" />
import 'mocha'

declare module 'mocha' {
  interface Suite {
    uri: any
  }
}
