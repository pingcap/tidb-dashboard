// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

export function login() {
  return cy.fixture('uri.json').then((uri) => {
    cy.visit(uri.login)
    cy.get('[data-e2e="signin_submit"]').click()
    // ensure login success
    cy.url().should('include', uri.overview)
  })
}

export function loginAndRedirect(to) {
  cy.login()
  cy.visit(to)
  cy.url().should('include', to)
}

Cypress.Commands.add('login', login)
Cypress.Commands.add('loginAndRedirect', loginAndRedirect)
