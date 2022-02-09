// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.
import { onlyOn, skipOn } from '@cypress/skip-test'

describe('TopSQL without ngm', function () {
  before(() => {
    cy.fixture('uri.json').then((uri) => (this.uri = uri))
  })

  beforeEach(() => {
    cy.login('root')
  })

  onlyOn(Cypress.env('TIDB_VERSION') === '5.0.0', () => {
    describe('Ngm not supported', () => {
      it('can not see top sql menu', () => {
        cy.get('[data-e2e]="menu_item_topsql"').should('not.exist')
      })
    })
  })

  skipOn(Cypress.env('TIDB_VERSION') !== 'nightly', () => {
    describe('Ngm not deployed', () => {
      it('show global notification about ngm not deployed', () => {})

      it('visit the top sql page, see ngm not deployed tips', () => {})
    })
  })
})
