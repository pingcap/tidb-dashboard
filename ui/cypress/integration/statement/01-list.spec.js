// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

import { restartTiUP, deleteDownloadsFolder } from '../utils'
import {
  testBaseSelectorOptions,
  checkAllOptionsInBaseSelector,
} from '../components'

import dayjs from 'dayjs'

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

  describe('Time range selector', () => {
    beforeEach(() => {
      cy.intercept(`${Cypress.env('apiBasePath')}statements/list*`).as(
        'init_statements_list'
      )
    })

    it('Default time range', () => {
      cy.get('[data-e2e=statement_timerange_selector]').should(
        'have.text',
        'Recent 30 min'
      )
    })

    it('Time range options', () => {
      // cy.intercept(`${Cypress.env('apiBasePath')}statements/list*`).as(
      //   'init_statements_list'
      // )

      // cy.wait('@init_statements_list')

      // get statements with last_seen checked
      cy.intercept(`${Cypress.env('apiBasePath')}statements/list*`).as(
        'statements_list_with_last_seen'
      )

      // select last_seen column field
      cy.get('[data-e2e=columns_selector_popover]')
        .trigger('mouseover')
        .then(() => {
          cy.contains('Last Seen').within(() => {
            cy.get('[data-e2e=columns_selector_field_last_seen]').check()
          })
        })

      const checkStmtListWithTimeRange = (stmtList, timeDiff) => {
        const now = dayjs().unix()
        stmtList.forEach((stmt) => {
          console.log('stmt.last_seen', stmt.last_seen)
          cy.wrap(stmt.last_seen)
            .should('be.lte', now)
            .and('be.gt', now - timeDiff)
        })
      }

      cy.wait('@statements_list_with_last_seen').then((res) => {
        const response = res.response.body
        checkStmtListWithTimeRange(response, 1800)

        // cy.get('[data-e2e=statement_time_range_option]')
        //   .should('have.length', 12)
        //   .each(($option, $idx) => {
        //     if ($idx == 0) {
        //       // Recent 15 min is enabled
        //       cy.wrap($option)
        //         .invoke('attr', 'class')
        //         .should('not.contain', 'time_range_item_disabled')
        //     } else if ($idx == 1) {
        //       // Recent 30 min is active
        //       cy.wrap($option)
        //         .invoke('attr', 'class')
        //         .should('contain', 'time_range_item_active')
        //     } else {
        //       // the reset options are disabled
        //       cy.wrap($option)
        //         .invoke('attr', 'class')
        //         .should('contain', 'time_range_item_disabled')
        //     }
        //   })

        cy.get('[data-automation-key=digest_text]').should(
          'have.length',
          response.length
        )
      })
    })
  })

  // describe('Filter statements by changing database', () => {
  //   it('No database selected by default', () => {
  //     cy.get('[data-e2e=base_select_input_text]')
  //       .eq(0)
  //       .should('has.text', 'All Databases')
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
  //         })
  //         .then(() => {
  //           cy.contains('SELECT count (?) FROM user;').should('exist')
  //         })
  //     })

  //     // Use databases config remembered
  //     cy.reload()
  //     cy.get('[data-e2e=base_select_input_text]')
  //       .eq(0)
  //       .should('has.text', '1 Databases')
  //   })
  // })

  // describe('Filter statements by changing kind', () => {
  //   it('No kind selected by default', () => {
  //     cy.get('[data-e2e=base_select_input_text]')
  //       .eq(1)
  //       .should('has.text', 'All Kinds')
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
  //       cy.get('[data-e2e=syntax_highlighter_compact]').should(
  //         'have.length',
  //         statementsList.length
  //       )
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
  //         })
  //         .then(() => {
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

  //     cy.get('[data-e2e=sql_statements_search]').type(' SELECT version{enter}')

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
  //       cy.get('[data-e2e=syntax_highlighter_compact]').should(
  //         'has.length',
  //         statementsList.length
  //       )
  //     })
  //   })
  // })

  // describe('Selected Columns', () => {
  //   const defaultColumns = {
  //     digest_text: 'Statement Template ',
  //     sum_latency: 'Total Latency ',
  //     avg_latency: 'Mean Latency ',
  //     exec_count: '# Exec ',
  //     plan_count: '# Plans ',
  //   }

  //   it('Default selected columns', () => {
  //     cy.get('[role=columnheader]')
  //       .not('.is-empty')
  //       .should('have.length', 5)
  //       .each(($column, idx) => {
  //         cy.wrap($column).contains(
  //           defaultColumns[Object.keys(defaultColumns)[idx]]
  //         )
  //       })
  //   })

  //   it('Hover on columns selector and check selected fields', () => {
  //     cy.get('[data-e2e=columns_selector_popover]')
  //       .trigger('mouseover')
  //       .then(() => {
  //         cy.get('[data-e2e=columns_selector_popover_content]')
  //           .should('be.visible')
  //           .within(() => {
  //             cy.get('.ant-checkbox-wrapper-checked')
  //               // .should('have.length', 5)
  //               .then(($options) => {
  //                 return Cypress.$.makeArray($options).map(
  //                   (option) => option.innerText
  //                 )
  //               })
  //               // make sure there exists the default executed statements
  //               .should('to.deep.eq', Object.values(defaultColumns))
  //           })
  //       })
  //   })

  //   it('Select all column fields', () => {
  //     cy.get('[data-e2e=columns_selector_popover]')
  //       .trigger('mouseover')
  //       .then(() => {
  //         cy.get('[data-e2e=column_selector_title]')
  //           .check()
  //           .then(() => {
  //             cy.get('[role=columnheader]')
  //               .not('.is-empty')
  //               .should('have.length', 43)
  //           })
  //       })
  //   })

  //   it('Reset selected column fields', () => {
  //     cy.get('[data-e2e=columns_selector_popover]')
  //       .trigger('mouseover')
  //       .then(() => {
  //         cy.get('[data-e2e=column_selector_reset]')
  //           .click()
  //           .then(() => {
  //             cy.get('[role=columnheader]')
  //               .not('.is-empty')
  //               .should('have.length', 5)
  //           })
  //       })
  //   })

  //   it('Select an orbitary column field', () => {
  //     cy.get('[data-e2e=columns_selector_popover]')
  //       .trigger('mouseover')
  //       .then(() => {
  //         cy.contains('Total Coprocessor Tasks')
  //           .within(() => {
  //             cy.get(
  //               '[data-e2e=columns_selector_field_sum_cop_task_num]'
  //             ).check()
  //           })
  //           .then(() => {
  //             cy.get('[data-item-key=sum_cop_task_num]').should(
  //               'have.text',
  //               'Total Coprocessor Tasks'
  //             )
  //           })
  //       })
  //   })

  //   it('UnCheck last selected orbitary column field', () => {
  //     cy.get('[data-e2e=columns_selector_popover]')
  //       .trigger('mouseover')
  //       .then(() => {
  //         cy.contains('Total Coprocessor Tasks')
  //           .within(() => {
  //             cy.get(
  //               '[data-e2e=columns_selector_field_sum_cop_task_num]'
  //             ).uncheck()
  //           })
  //           .then(() => {
  //             cy.get('[data-item-key=sum_cop_task_num]').should('not.exist')
  //           })
  //       })
  //   })

  //   it('Check SHOW_FULL_QUERY_TEXT', () => {
  //     cy.get('[data-e2e=columns_selector_popover]')
  //       .trigger('mouseover')
  //       .then(() => {
  //         cy.get('[data-e2e=statement_show_full_sql]')
  //           .check()
  //           .then(() => {
  //             cy.get('[data-automation-key=digest_text]')
  //               .eq(0)
  //               .find('[data-e2e=syntax_highlighter_original]')
  //           })

  //         cy.get('[data-e2e=statement_show_full_sql]')
  //           .uncheck()
  //           .then(() => {
  //             cy.get('[data-automation-key=digest_text]')
  //               .eq(0)
  //               .trigger('mouseover')
  //               .find('[data-e2e=syntax_highlighter_compact]')
  //           })
  //       })
  //   })
  // })

  // describe('Reload statement', () => {
  //   it('Reload statement table after execute a query', () => {
  //     let queryData = {
  //       query: 'select count(*) from tidb;',
  //       database: 'mysql',
  //     }
  //     cy.task('queryDB', { ...queryData })

  //     cy.intercept(`${Cypress.env('apiBasePath')}statements/list*`).as(
  //       'statements_list'
  //     )
  //     cy.wait('@statements_list').then(() => {
  //       cy.get('[data-e2e=statement_refresh]')
  //         .click()
  //         .then(() => {
  //           cy.get('[data-automation-key=digest_text]').contains(
  //             'SELECT count (?) FROM tidb;'
  //           )
  //         })
  //     })
  //   })
  // })

  // describe('Statement Setting', () => {
  //   it('Close setting panel', () => {
  //     cy.get('[data-e2e=statement_setting]')
  //       .click()
  //       .then(() => {
  //         cy.get('.ant-drawer-mask')
  //           .click()
  //           .then(() => {
  //             cy.get('.ant-drawer-content').should('not.be.visible')
  //           })
  //       })

  //     cy.get('[data-e2e=statement_setting]')
  //       .click()
  //       .then(() => {
  //         cy.get('.ant-drawer-close')
  //           .click()
  //           .then(() => {
  //             cy.get('.ant-drawer-content').should('not.be.visible')
  //           })
  //       })
  //   })

  //   const siwtchStatement = (isEnabled) => {
  //     cy.get('[data-e2e=statement_setting]')
  //       .click()
  //       .then(() => {
  //         cy.get('.ant-drawer-content').should('exist')
  //         cy.get('[data-e2e=statemen_enbale_switcher]')
  //           // the current of switcher is isEnabled
  //           .should('have.attr', 'aria-checked', isEnabled)
  //           .click()
  //         cy.get('[data-e2e=submit_btn]').click()
  //       })
  //   }

  //   it('Disable statement feature', () => {
  //     siwtchStatement('true')
  //     cy.get('.ant-modal-confirm-btns').find('.ant-btn-dangerous').click()
  //     cy.get('[data-e2e=statements_table]').should('not.exist')
  //   })

  //   it('Enable statement feature', () => {
  //     siwtchStatement('false')
  //     cy.get('[data-e2e=statements_table]').should('exist')
  //   })

  //   const checkSilder = (sizeList, defaultValueNow, dataE2EValue) => {
  //     cy.get('[data-e2e=statement_setting]')
  //       .click()
  //       .then(() => {
  //         cy.get(`[data-e2e=${dataE2EValue}]`).within(() => {
  //           cy.get('.ant-slider-handle').should(
  //             'have.attr',
  //             'aria-valuenow',
  //             defaultValueNow
  //           )

  //           cy.get('.ant-slider-mark-text')
  //             .then(($marks) => {
  //               return Cypress.$.makeArray($marks).map((mark) => mark.innerText)
  //             })
  //             // make sure there exists the default executed statements
  //             .should('to.deep.eq', sizeList)
  //         })
  //       })
  //   }

  //   it('Statement setting max size', () => {
  //     const sizeList = ['200', '1000', '2000', '5000']
  //     checkSilder(sizeList, '3000', 'statement_setting_max_size')
  //   })

  //   it('Statement setting window size', () => {
  //     const sizeList = ['1', '5', '15', '30', '60']
  //     checkSilder(sizeList, '30', 'statement_setting_refresh_interval')
  //   })

  //   it('Statement setting number of windows', () => {
  //     const sizeList = ['1', '255']
  //     checkSilder(sizeList, '24', 'statement_setting_history_size')
  //   })

  //   describe('SQL Statement History Size', () => {
  //     beforeEach(() => {
  //       cy.get('[data-e2e=statement_setting]')
  //         .click()
  //         .then(() => {
  //           // get refresh_interval value
  //           cy.get(`[data-e2e=statement_setting_refresh_interval]`).within(
  //             () => {
  //               cy.get('.ant-slider-handle')
  //                 .invoke('attr', 'aria-valuenow')
  //                 .as('refreshIntervalVal')
  //             }
  //           )

  //           // get history_size value
  //           cy.get(`[data-e2e=statement_setting_history_size]`).within(() => {
  //             cy.get('.ant-slider-handle')
  //               .invoke('attr', 'aria-valuenow')
  //               .as('historySizeVal')
  //           })
  //         })
  //     })

  //     const calcStmtHistorySize = (refreshInterval, historySize) => {
  //       const totalMins = refreshInterval * historySize
  //       const day = Math.floor(totalMins / (24 * 60))
  //       const hour = Math.floor((totalMins - day * 24 * 60) / 60)
  //       const min = totalMins - day * 24 * 60 - hour * 60
  //       return `${day} day ${hour} hour ${min} min`
  //     }

  //     it('Check History Size', function () {
  //       const stmtHistorySize = calcStmtHistorySize(
  //         this.refreshIntervalVal,
  //         this.historySizeVal
  //       )
  //       console.log('stmtHistorySize', stmtHistorySize)

  //       cy.get('[data-e2e=statement_setting_keep_duration]').within(() => {
  //         cy.get('.ant-form-item-control-input-content').should(
  //           'have.text',
  //           calcStmtHistorySize(this.refreshIntervalVal, this.historySizeVal)
  //         )
  //       })
  //     })
  //   })
  // })
})
