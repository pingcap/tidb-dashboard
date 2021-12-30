// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

describe('Login session', () => {
  beforeEach(() => {
    cy.fixture('uri.json').then(function (uri) {
      this.uri = uri
    })
  })

  it('Redirect to sigin page when unlogin', function () {
    cy.visit(`${this.uri.overview}`)
    cy.intercept('GET', `${Cypress.env('apiUrl')}/statements/config`).as(
      'statements'
    )
    cy.wait('@statements').should(({ response }) => {
      expect(response.body).to.have.property('code', 'common.unauthenticated')
    })

    cy.url('include', `${this.uri.login}`)
  })
})
