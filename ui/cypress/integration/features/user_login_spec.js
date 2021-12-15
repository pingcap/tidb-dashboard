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
    it('root login with no pwd', () => {
      cy.exec(
        `echo "SET PASSWORD FOR 'root'@'%' = '';" | mysql --comments --host 127.0.0.1 --port 4000 -u root`
      )
      cy.get('[data-e2e=signin_username_input]').should('have.value', 'root')
      cy.get('[data-e2e=signin_submit]').click()
      cy.url().should('include', '/overview')
    })

    it('last succeeded login username is root', () => {
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
      cy.exec(
        `echo "SET PASSWORD FOR 'root'@'%' = 'root_pwd';" | mysql --comments --host 127.0.0.1 --port 4000 -u root`
      )
      cy.get('[data-e2e="signin_password_input"]').type('root_pwd{enter}')
      cy.url().should('include', '/overview')
      cy.exec(
        `echo "SET PASSWORD FOR 'root'@'%' = '';" | mysql --comments --host 127.0.0.1 --port 4000 -u root -p'root_pwd'`
      )
    })
  })

  describe('nonRoot login', () => {
    // create user test
    before(() => {
      cy.exec(
        `echo "DROP USER IF EXISTS 'test'@'%';" | mysql --comments --host 127.0.0.1 --port 4000 -u root`
      )
      cy.exec(
        `echo "CREATE USER 'test'@'%' IDENTIFIED BY 'test';" | mysql --comments --host 127.0.0.1 --port 4000 -u root`
      )
      cy.exec(
        `echo "GRANT ALL PRIVILEGES ON *.* TO 'test'@'%' WITH GRANT OPTION;" | mysql --comments --host 127.0.0.1 --port 4000 -u root`
      )
    })

    it('nonRoot user with correct password', function () {
      cy.get('[data-e2e=signin_username_input]').clear().type('test')
      cy.get('[data-e2e="signin_password_input"]').type('test{enter}')
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
