// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

// Test User login
describe('Root User Login', () => {
  beforeEach(function () {
    cy.fixture('uri.json').then(function (uri) {
      this.uri = uri
      cy.visit(this.uri.root)
    })
  })

  it('authenticated redirect', function () {
    // Redirect to login
    cy.visit(this.uri.root)
    cy.url().should('eq', `${Cypress.config().baseUrl}${this.uri.root}`)
  })

  it('root login with no pwd', function () {
    cy.get('[data-e2e=signin_username_input]').should('have.value', 'root')
    cy.get('[data-e2e=signin_submit]').click()
    cy.url().should('include', this.uri.overview)
  })

  it('remember last succeeded login username', () => {
    cy.get('[data-e2e=signin_username_input]').should('have.value', 'root')
  })

  it('root login with incorrect pwd', () => {
    cy.intercept('POST', `${Cypress.env('apiBasePath')}user/login`).as('login')

    // {enter} causes the form to submit
    cy.get('[data-e2e="signin_password_input"]').type(
      'incorrect_password{enter}'
    )

    cy.wait('@login').should(({ response }) => {
      expect(response.body).to.have.property('code', 'tidb.tidb_auth_failed')
    })
  })

  it('root login with correct pwd', function () {
    // set password for root
    let queryData = {
      query: 'SET PASSWORD FOR "root"@"%" = "root_pwd"'
    }
    cy.task('queryDB', { ...queryData })

    cy.get('[data-e2e="signin_password_input"]').type('root_pwd{enter}')
    cy.url().should('include', this.uri.overview)

    // set empty password for root
    queryData = {
      query: 'SET PASSWORD FOR "root"@"%" = ""',
      password: 'root_pwd'
    }
    cy.task('queryDB', { ...queryData })
  })
})
