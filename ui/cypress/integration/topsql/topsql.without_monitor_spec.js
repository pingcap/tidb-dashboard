// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

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
