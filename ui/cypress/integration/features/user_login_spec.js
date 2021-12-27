// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

// Test User login
describe('User Login with nonRootLogin supported', () => {
  // run before a set of tests
  before(() => {
    // Check noRootLogin is supported
    cy.request(`${Cypress.env('apiUrl')}info/info`).then((resp) => {
      expect(resp.status).to.eq(200)
      expect(resp.body.supported_features).include('nonRootLogin')
    })
  })

  // run before each test
  beforeEach(function () {
    // Load a fixed set of data located in cypress/fixtures.
    cy.fixture('uri.json').as('uri')

    // Direct to login page
    cy.visit('@uri.root')
    cy.get('[data-e2e=signin_username_input]').should('not.be.disabled')
  })

  it('authenticated redirect', function () {
    // Redirect to login
    cy.visit(this.uri.root)
    cy.url().should('eq', `${Cypress.config().baseUrl}${this.uri.login}`)
  })

  describe('root login', () => {
    it('root login with no pwd', function () {
      cy.get('[data-e2e=signin_username_input]').should('have.value', 'root')
      cy.get('[data-e2e=signin_submit]').click()
      cy.url().should('include', '/overview')
    })

    it('remember last succeeded login username', () => {
      cy.get('[data-e2e=signin_username_input]').should('have.value', 'root')
    })

    it('root login with incorrect pwd', () => {
      cy.intercept('POST', '/dashboard/api/user/login').as('login')

      // {enter} causes the form to submit
      cy.get('[data-e2e="signin_password_input"]').type(
        'incorrect_password{enter}'
      )
      cy.wait('@login').then(() => {
        cy.get('[data-e2e="signin_password_form_item"]').should(
          'have.class',
          'ant-form-item-has-error'
        )
      })
    })

    it('root login with correct pwd', () => {
      // set password for root
      let query = "SET PASSWORD FOR 'root'@'%' = 'root_pwd'"
      let password = ''
      cy.task('queryDB', { query, password })

      cy.get('[data-e2e="signin_password_input"]').type('root_pwd{enter}')
      cy.url().should('include', '/overview')

      // set empty password for root
      query = "SET PASSWORD FOR 'root'@'%' = ''"
      password = 'root_pwd'
      cy.task('queryDB', { query, password })
    })
  })

  describe('nonRoot login', () => {
    // create user test
    before(() => {
      // set empty password for root
      let query = "DROP USER IF EXISTS 'test'@'%'"
      let password = ''
      cy.task('queryDB', { query, password })

      query = "CREATE USER 'test'@'%' IDENTIFIED BY 'test_pwd'"
      cy.task('queryDB', { query, password })

      query = "GRANT ALL PRIVILEGES ON *.* TO 'test'@'%' WITH GRANT OPTION"
      cy.task('queryDB', { query, password })
    })

    it('nonRoot user with correct password', function () {
      cy.get('[data-e2e=signin_username_input]').clear().type('test')
      cy.get('[data-e2e="signin_password_input"]').type('test_pwd{enter}')
      cy.url().should('include', '/overview')
    })

    it('nonRoot user with incorrect password', function () {
      cy.get('[data-e2e=signin_username_input]').clear().type('test')
      cy.get('[data-e2e="signin_password_input"]').type('incorrect_pwd{enter}')
      cy.get('[data-e2e="signin_password_form_item"]').should(
        'have.class',
        'ant-form-item-has-error'
      )
    })
  })
})
