// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

import { restartTiUP, deleteDownloadsFolder } from '../utils'
import {
  testBaseSelectorOptions,
  checkAllOptionsInBaseSelector,
} from '../components'

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

    it('Statements which executed by default when starting TiDB', () => {
      const defaultExecStmtList = [
        'SHOW DATABASES',
        'SELECT DISTINCT `stmt_type` FROM `information_schema`.`cluster_statements_summary_history` ORDER BY `stmt_type` ASC',
        'SELECT `version` ()',
      ]

      cy.intercept(`${Cypress.env('apiBasePath')}statements/list*`).as(
        'statements_list'
      )

      cy.wait('@statements_list').then((res) => {
        const response = res.response.body

        cy.get('[data-e2e=syntax_highlighter_compact]')
          .should('have.length', response.length)
          .then(($stmts) => {
            // we get a list of jQuery elements
            // let's convert the jQuery object into a plain array
            return (
              Cypress.$.makeArray($stmts)
                // and extract inner text from each
                .map((stmt) => stmt.innerText)
            )
          })
          // make sure there exists the default executed statements
          .should('to.include.members', defaultExecStmtList)
      })
    })
  })

  describe('Filter slow query by changing database', () => {
    it('No database selected by default', () => {
      cy.get('[data-e2e=base_select_input]').should('has.text', '')
    })

    it('Show all databases', () => {
      cy.intercept(`${Cypress.env('apiBasePath')}info/databases`).as(
        'databases'
      )

      cy.wait('@databases').then((res) => {
        const databases = res.response.body
        testBaseSelectorOptions(databases, 0)
      })
    })

    it('Filter statements without use database', () => {
      checkAllOptionsInBaseSelector(0)
    })
  })

  describe('', () => {
    it('Show all databases', () => {
      cy.intercept(`${Cypress.env('apiBasePath')}info/databases`).as(
        'databases'
      )

      cy.wait('@databases').then((res) => {
        const databaseList = res.response.body
        testBaseSelectorOptions(databaseList, 0)
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
        testBaseSelectorOptions(stmtTypesList, 1)
      })
    })
  })
})
