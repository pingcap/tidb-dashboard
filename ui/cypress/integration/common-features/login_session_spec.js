// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

describe('Login session', () => {
  beforeEach(() => {
    cy.fixture('uri.json').then(function (uri) {
      this.uri = uri
    })
  })

  it('Redirect to sigin page when user not login', function () {
    cy.visit(this.uri.overview)
    // cy.get('.ant-message-error').should('be.visible')
    expect(localStorage.getItem('dashboard_auth_token')).to.be.null
    cy.url('include', `${this.uri.login}`)
  })

  // Use fake token to indicate session expired.
  it('Redirect user to sigin page when session token expired', function () {
    // Set `dashboard_auth_token` with an invalid token
    localStorage.setItem('dashboard_auth_token', 'invalid_auth_token')
    cy.visit(this.uri.overview)

    cy.url('include', `${this.uri.login}`)
    cy.get('.ant-message-error').should('be.visible')
  })
})
