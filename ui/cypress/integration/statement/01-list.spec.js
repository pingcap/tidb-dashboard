// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

import { restartTiUP, deleteDownloadsFolder } from '../utils'
import { checkBaseSelector } from '../components'

describe('SlowQuery list page', () => {
  before(() => {
    cy.fixture('uri.json').then(function (uri) {
      this.uri = uri
    })

    // restartTiUP()

    deleteDownloadsFolder()
  })

  beforeEach(function () {
    cy.login('root')
    cy.visit(this.uri.statement)
    cy.url().should('include', this.uri.statement)
  })

  describe('Initialize statemen list page', () => {
    it('Statement side bar highlighted', () => {
      cy.get('[data-e2e=menu_item_statement]')
        .should('be.visible')
        .and('has.class', 'ant-menu-item-selected')
    })

    it('Has Toolbar', function () {
      cy.get('[data-e2e=statement_toolbar]').should('be.visible')
    })

    it('Statements is enabled by default', () => {
      cy.get('[data-e2e=statements_table]').should('be.visible')
    })

    it('Get statement list bad request', () => {
      const staticResponse = {
        statusCode: 400,
        body: {
          code: 'common.bad_request',
          error: true,
          message: 'common.bad_request',
        },
      }

      // stub out a response body
      cy.intercept(
        `${Cypress.env('apiBasePath')}statements/list*`,
        staticResponse
      ).as('statements_list')
      cy.wait('@statements_list').then(() => {
        cy.get('[data-e2e=alert_error_bar]').should(
          'has.text',
          staticResponse.body.message
        )
      })
    })
  })

  describe('', () => {
    it('Show all databases', () => {
      cy.intercept(`${Cypress.env('apiBasePath')}info/databases`).as(
        'databases'
      )

      cy.wait('@databases').then((res) => {
        const databaseList = res.response.body
        checkBaseSelector(databaseList, 0)
      })
    })
  })

  describe('', () => {
    it('Show all kind of statements', () => {
      cy.intercept(`${Cypress.env('apiBasePath')}statements/stmt_types`).as(
        'stmt_types'
      )

      cy.wait('@stmt_types').then((res) => {
        const stmtTypesList = res.response.body
        checkBaseSelector(stmtTypesList, 1)
      })
    })
  })
})
