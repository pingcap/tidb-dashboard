// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

import { skipOn } from '@cypress/skip-test'

describe('Read-only user open statement config setting', () => {
  skipOn(Cypress.env('FEATURE_VERSION') !== '6.0.0', () => {
    // Create read only user
    before(() => {
      const workloads = [
        'DROP USER IF EXISTS "readOnlyUser"@"%"',
        'CREATE USER "readOnlyUser"@"%" IDENTIFIED BY "test";',
        'GRANT PROCESS, CONFIG ON *.* TO "readOnlyUser"@"%";',
        'GRANT SHOW DATABASES ON *.* TO "readOnlyUser"@"%";',
        'GRANT DASHBOARD_CLIENT ON *.* TO "readOnlyUser"@"%";'
      ]

      workloads.forEach((query) => {
        cy.task('queryDB', { query })
      })

      cy.fixture('uri.json').then(function (uri) {
        this.uri = uri
      })
    })

    beforeEach(function () {
      // login with readOnlyUser
      cy.visit(this.uri.login)
      cy.get('[data-e2e=signin_username_input]').clear().type('readOnlyUser')
      cy.get('[data-e2e="signin_password_input"]').type('test{enter}')

      cy.visit(this.uri.statement)
      cy.url().should('include', this.uri.statement)
    })

    it('Unable to modify statement settings', function () {
      cy.get('[data-e2e=statement_setting]').click({ force: true })

      // switch is disabled
      cy.get('[data-e2e=statemen_enbale_switcher]').should(
        'have.class',
        'ant-switch-disabled'
      )

      // max size is disabled
      cy.get('[data-e2e=statement_setting_max_size]').within(() => {
        cy.get('.ant-slider').should('have.class', 'ant-slider-disabled')
      })

      // refresh interval is disabled
      cy.get('[data-e2e=statement_setting_refresh_interval]').within(() => {
        cy.get('.ant-slider').should('have.class', 'ant-slider-disabled')
      })
      // internal query is disabled
      cy.get('[data-e2e=statement_setting_internal_query]').within(() => {
        cy.get('.ant-switch').should('have.class', 'ant-switch-disabled')
      })

      // save button is disableds
      cy.get('[data-e2e=submit_btn]').should('have.attr', 'disabled')
    })
  })
})
