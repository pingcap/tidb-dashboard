// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.
import { skipOn } from '@cypress/skip-test'

describe('TopSQL without ngm', function () {
  skipOn(Cypress.env('TIDB_VERSION') === '^5.0', () => {
    before(() => {
      cy.fixture('uri.json').then((uri) => (this.uri = uri))
    })

    beforeEach(() => {
      cy.login('root')

      cy.visit(this.uri.topsql)
    })

    describe('Ngm not deployed', () => {
      it('show global notification about ngm not deployed', () => {
        cy.get('.ant-notification-notice-message').should(
          'contain',
          'System Health Check Failed'
        )

        cy.get('[data-e2e="ngm_not_started"]').should('exist')
      })
    })
  })
})
