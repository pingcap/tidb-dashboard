// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

describe('Top SQL security', function () {
  it("can't access the Top SQL page without login, then redirect to login page", function () {
    cy.on('uncaught:exception', function () {
      return false
    })
    cy.fixture('uri.json').then(function (uri) {
      cy.visit(uri.topsql)
      cy.url().should('include', uri.login)
    })
  })
})
