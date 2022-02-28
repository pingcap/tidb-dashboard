// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

import { restartTiUP, deleteDownloadsFolder } from '../utils'
import {
  testBaseSelectorOptions,
  checkAllOptionsInBaseSelector,
} from '../components'

describe('SQL statements list page', () => {
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

  const defaultExecStmtList = [
    'SHOW DATABASES',
    'SELECT DISTINCT `stmt_type` FROM `information_schema`.`cluster_statements_summary_history` ORDER BY `stmt_type` ASC',
    'SELECT `version` ()',
  ]

  // describe('Initialize statemen list page', () => {
  //   it('Statement side bar highlighted', () => {
  //     cy.get('[data-e2e=menu_item_statement]')
  //       .should('be.visible')
  //       .and('has.class', 'ant-menu-item-selected')
  //   })

  //   it('Has Toolbar', function () {
  //     cy.get('[data-e2e=statement_toolbar]').should('be.visible')
  //   })

  //   it('Statements is enabled by default', () => {
  //     cy.get('[data-e2e=statements_table]').should('be.visible')
  //   })

  //   it('Get statement list bad request', () => {
  //     const staticResponse = {
  //       statusCode: 400,
  //       body: {
  //         code: 'common.bad_request',
  //         error: true,
  //         message: 'common.bad_request',
  //       },
  //     }

  //     // stub out a response body
  //     cy.intercept(
  //       `${Cypress.env('apiBasePath')}statements/list*`,
  //       staticResponse
  //     ).as('statements_list')
  //     cy.wait('@statements_list').then(() => {
  //       cy.get('[data-e2e=alert_error_bar]').should(
  //         'has.text',
  //         staticResponse.body.message
  //       )
  //     })
  //   })

  //   it('Statements which executed by default when starting TiDB', () => {
  //     cy.intercept(`${Cypress.env('apiBasePath')}statements/list*`).as(
  //       'statements_list'
  //     )

  //     cy.wait('@statements_list').then((res) => {
  //       const response = res.response.body

  //       cy.get('[data-e2e=syntax_highlighter_compact]')
  //         .should('have.length', response.length)
  //         .then(($stmts) => {
  //           // we get a list of jQuery elements
  //           // let's convert the jQuery object into a plain array
  //           return (
  //             Cypress.$.makeArray($stmts)
  //               // and extract inner text from each
  //               .map((stmt) => stmt.innerText)
  //           )
  //         })
  //         // make sure there exists the default executed statements
  //         .should('to.include.members', defaultExecStmtList)
  //     })
  //   })
  // })

  // describe('Filter statements by changing database', () => {
  //   it('No database selected by default', () => {
  //     cy.get('[data-e2e=base_select_input_text]').eq(0).should('has.text', 'All Databases')
  //   })

  //   it('Show all databases', () => {
  //     cy.intercept(`${Cypress.env('apiBasePath')}info/databases`).as(
  //       'databases'
  //     )

  //     cy.wait('@databases').then((res) => {
  //       const databases = res.response.body
  //       testBaseSelectorOptions(databases, 0)
  //     })
  //   })

  //   it('Filter statements without use database', () => {
  //     cy.intercept(`${Cypress.env('apiBasePath')}info/databases`).as(
  //       'databases'
  //     )

  //     cy.wait('@databases').then(() => {
  //       // check all options in databases selector
  //       checkAllOptionsInBaseSelector(0)
  //     })

  //     // check the existence of statements without use database
  //     cy.contains(defaultExecStmtList[0]).should('not.exist')
  //     cy.contains(defaultExecStmtList[2]).should('not.exist')
  //   })

  //   it('Filter statements with use database (mysql)', () => {
  //     let queryData = {
  //       query: 'SELECT count(*) from user;',
  //       database: 'mysql',
  //     }
  //     cy.task('queryDB', { ...queryData })

  //     cy.intercept(`${Cypress.env('apiBasePath')}info/databases`).as(
  //       'databases'
  //     )

  //     cy.wait('@databases').then(() => {
  //       cy.get('[data-e2e=base_selector]')
  //         .eq(0)
  //         .click()
  //         .then(() => {
  //           cy.get('.ant-dropdown').within(() => {
  //             cy.get('.ant-checkbox-input').eq(3).click()
  //           })
  //         }).then(() => {
  //           cy.contains('SELECT count (?) FROM user;').should('exist')
  //         })
  //     })

  //     // Use databases config remembered
  //     cy.reload()
  //     cy.get('[data-e2e=base_select_input_text]').eq(0).should('has.text', '1 Databases')
  //   })
  // })

  // describe('Filter statements by changing kind', () => {
  //   it('No kind selected by default', () => {
  //     cy.get('[data-e2e=base_select_input_text]').eq(1).should('has.text', 'All Kinds')
  //   })

  //   it('Show all kind of statements', () => {
  //     cy.intercept(`${Cypress.env('apiBasePath')}statements/stmt_types`).as(
  //       'stmt_types'
  //     )

  //     cy.wait('@stmt_types').then((res) => {
  //       const stmtTypesList = res.response.body
  //       testBaseSelectorOptions(stmtTypesList, 1)
  //     })
  //   })

  //   it('Filter statements with all kind checked', () => {
  //     cy.intercept(`${Cypress.env('apiBasePath')}statements/stmt_types`).as(
  //       'stmt_types'
  //     )

  //     cy.intercept(`${Cypress.env('apiBasePath')}statements/list*`).as(
  //       'statements_list'
  //     )

  //     cy.wait(['@stmt_types', '@statements_list']).then((interceptions) => {
  //       // check all options in kind selector
  //       checkAllOptionsInBaseSelector(1)
  //       const statementsList = interceptions[1].response.body
  //       cy.get('[data-e2e=syntax_highlighter_compact]')
  //         .should('have.length', statementsList.length)
  //     })

  //   })

  //   it('Filter statements with one kind checked', () => {
  //     cy.intercept(`${Cypress.env('apiBasePath')}statements/stmt_types`).as(
  //       'stmt_types'
  //     )

  //     cy.wait('@stmt_types').then(() => {
  //       cy.get('[data-e2e=base_selector]')
  //         .eq(1)
  //         .click()
  //         .then(() => {
  //           cy.get('.ant-dropdown').within(() => {
  //             cy.get('.ant-checkbox-input').eq(2).click()
  //           })
  //         }).then(() => {
  //           cy.get('[data-e2e=syntax_highlighter_compact]').each(($sql) => {
  //             cy.wrap($sql).contains('SELECT')
  //           })
  //         })
  //     })
  //   })
  // })

  // describe('Search function', () => {
  //   it('Default search text', () => {
  //     cy.get('[data-e2e=sql_statements_search]').should('be.empty')
  //   })

  //   it('Search item with space', () => {
  //     cy.intercept(`${Cypress.env('apiBasePath')}statements/list*`).as(
  //       'statements_list'
  //     )

  //     cy.get('[data-e2e=sql_statements_search]')
  //       .type(' SELECT version{enter}')

  //     cy.wait('@statements_list').then(() => {
  //       cy.get('[data-e2e=syntax_highlighter_compact]').should('has.length', 1)
  //     })
  //   })

  //   it('Type search without pressing enter then reload', () => {
  //     cy.get('[data-e2e=sql_statements_search]').type('SELECT version')

  //     cy.reload()
  //     cy.intercept(`${Cypress.env('apiBasePath')}statements/list*`).as(
  //       'statements_list'
  //     )

  //     cy.get('[data-e2e=sql_statements_search]').clear().type('{enter}')

  //     cy.wait('@statements_list').then((res) => {
  //       const statementsList = res.response.body
  //       cy.get('[data-e2e=syntax_highlighter_compact]').should('has.length', statementsList.length)
  //     })
  //   })
  // })

  describe('Selected Columns', () => {
    const defaultColumns = {
      'Statement Template': 'digest_text',
      'Total Latency': 'sum_latency',
      'Mean Latency': 'avg_latency',
      Exec: 'exec_count',
      Plans: 'plan_count',
    }

    it('Default selected columns', () => {
      cy.get('[role=columnheader]').not('.is-empty')
      // .should('have.length', 5)
      // .each(($column) => {
      //   console.log('defaultColumns[$column]', defaultColumns[$column])
      //   cy.wrap($column).contains(defaultColumns[$column])
      // })
    })

    // it('Hover on columns selector and check selected fileds ', () => {
    //   cy.get('[data-e2e=columns_selector_popover]')
    //     .trigger('mouseover')
    //     .then(() => {
    //       cy.get('[data-e2e=columns_selector_popover_content]')
    //         .should('be.visible')
    //         .within(() => {
    //           // check default selectedColumns checked
    //           defaultColumns.forEach((c, idx) => {
    //             cy.contains(c)
    //               .parent()
    //               .within(() => {
    //                 cy.get(
    //                   `[data-e2e=columns_selector_field_${defaultColumnsKeys[idx]}]`
    //                 ).should('be.checked')
    //               })
    //           })
    //         })
    //     })
    // })

    // it('Select all column fileds', () => {
    //   cy.get('[data-e2e=columns_selector_popover]')
    //     .trigger('mouseover')
    //     .then(() => {
    //       cy.get('[data-e2e=column_selector_title]')
    //         .check()
    //         .then(() => {
    //           cy.get('[role=columnheader]')
    //             .not('.is-empty')
    //             .should('have.length', 44)
    //         })
    //     })
    // })

    // it('Reset selected column fields', () => {
    //   cy.get('[data-e2e=columns_selector_popover]')
    //     .trigger('mouseover')
    //     .then(() => {
    //       cy.get('[data-e2e=column_selector_reset]')
    //         .click()
    //         .then(() => {
    //           cy.get('[role=columnheader]')
    //             .not('.is-empty')
    //             .should('have.length', 4)
    //         })
    //     })
    // })

    // it('Select an orbitary column field', () => {
    //   cy.get('[data-e2e=columns_selector_popover]')
    //     .trigger('mouseover')
    //     .then(() => {
    //       cy.contains('Max Disk')
    //         .within(() => {
    //           cy.get('[data-e2e=columns_selector_field_disk_max]').check()
    //         })
    //         .then(() => {
    //           cy.get('[role=columnheader]')
    //             .not('.is-empty')
    //             .last()
    //             .should('have.text', 'Max Disk ')
    //         })
    //     })
    // })

    // it('UnCheck last selected orbitary column field', () => {
    //   cy.get('[data-e2e=columns_selector_popover]')
    //     .trigger('mouseover')
    //     .then(() => {
    //       cy.contains('Max Disk')
    //         .within(() => {
    //           cy.get('[data-e2e=columns_selector_field_disk_max]').uncheck()
    //         })
    //         .then(() => {
    //           cy.get('[role=columnheader]')
    //             .eq(1)
    //             .should('have.text', 'Finish Time ')
    //         })
    //     })
    // })

    // it('Check SLOW_QUERY_SHOW_FULL_SQL', () => {
    //   cy.get('[data-e2e=columns_selector_popover]')
    //     .trigger('mouseover')
    //     .then(() => {
    //       cy.get('[data-e2e=slow_query_show_full_sql]')
    //         .check()
    //         .then(() => {
    //           cy.get('[data-automation-key=query]')
    //             .eq(0)
    //             .find('[data-e2e=syntax_highlighter_original]')
    //         })

    //       cy.get('[data-e2e=slow_query_show_full_sql]')
    //         .uncheck()
    //         .then(() => {
    //           cy.get('[data-automation-key=query]')
    //             .eq(0)
    //             .trigger('mouseover')
    //             .find('[data-e2e=syntax_highlighter_compact]')
    //         })
    //     })
    // })
  })
})
