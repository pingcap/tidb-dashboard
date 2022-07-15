/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable {
    login(username: string, password?: string): void

    getByTestId(dataTestAttribute: string, args?: any): Chainable<Element>
    getByTestIdLike(
      dataTestPrefixAttribute: string,
      args?: any
    ): Chainable<Element>

    matchImageSnapshot(nameOrOptions?: string | Options): void
    matchImageSnapshot(name: string, options: Options): void
  }
}
