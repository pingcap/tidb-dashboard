// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.
import { onlyOn } from '@cypress/skip-test'

onlyOn(Cypress.env('TIDB_VERSION') === '5.0.0', () => {
  describe('Ngm not supported', () => {
    before(() => {
      cy.fixture('uri.json').then((uri) => (this.uri = uri))
    })

    beforeEach(() => {
      cy.login('root')
    })

    it('can not see top sql menu', () => {
      cy.get('[data-e2e="menu_item_topsql"]').should('not.exist')
    })
  })
})

onlyOn(Cypress.env('WITHOUT_MONITOR'), () => {
  describe('TopSQL without ngm', function () {
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
          'System Health Check Falied'
        )

        cy.get('[data-e2e="ngm_not_started"]').should('exist')
      })
    })
  })
})
