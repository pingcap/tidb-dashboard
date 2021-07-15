// Copyright 2021 Suhaha
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

context('The Login Page', () => {
  beforeEach(() => {
    cy.fixture('config.json').as('config')
  })

  it('unauthorized redirect', function () {
    cy.visit(this.config.uri.root)
    cy.url().should('eq', `${Cypress.config().baseUrl}${this.config.uri.login}`)
  })

  it('should fail to sign in using incorrect password', function () {
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

  it('should sign in using correct password', function () {
    cy.visit(this.config.uri.login)
    cy.get('[data-e2e="signin_submit"]').click()
    cy.url().should(
      'eq',
      `${Cypress.config().baseUrl}${this.config.uri.overview}`
    )
  })
})
