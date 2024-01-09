// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

import dayjs from 'dayjs'

import {
  restartTiUP,
  validateStatementCSVList,
  deleteDownloadsFolder
} from '../utils'
import {
  testBaseSelectorOptions,
  checkAllOptionsInBaseSelector
} from '../components'

const neatCSV = require('neat-csv')
const path = require('path')

describe('SQL statements list page', () => {
  before(() => {
    cy.fixture('uri.json').then(function (uri) {
      this.uri = uri
    })

    restartTiUP()

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
    'SELECT `version` ()'
  ]

  describe('Initialize statement list page', () => {
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
          message: 'common.bad_request'
        }
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

  describe('Time range selector', () => {
    beforeEach(() => {
      cy.intercept(`${Cypress.env('apiBasePath')}statements/list*`).as(
        'statements_list'
      )

      cy.wait('@statements_list')

      // select last_seen column field
      cy.get('[data-e2e=columns_selector_popover]').trigger('mouseover')

      cy.contains('Last Seen').within(() => {
        cy.get('[data-e2e=columns_selector_field_last_seen]').check({
          force: true
        })
      })
    })

    const checkStmtListWithTimeRange = (stmtList, timeDiff) => {
      const now = dayjs().unix()

      stmtList.forEach((stmt) => {
        cy.wrap(stmt.last_seen)
          .should('be.lte', now)
          .and('be.gt', now - timeDiff)
      })
    }

    describe('Common time range selector', () => {
      it('Default time range', () => {
        cy.get('[data-e2e=timerange-selector]').should(
          'have.text',
          'Recent 30 min'
        )
      })

      it('Init statement list', () => {
        cy.wait('@statements_list').then((res) => {
          const response = res.response.body

          cy.get('[data-automation-key=digest_text]').should(
            'have.length',
            response.length
          )

          checkStmtListWithTimeRange(response, 1800)
        })
      })

      it('Select time range as recent 15 mins', () => {
        cy.wait('@statements_list')

        // select recent 15 mins
        cy.get('[data-e2e=selected_timerange]')
          .click()
          .then(() => {
            cy.get('[data-e2e=timerange-900]').click()
          })

        cy.wait('@statements_list').then((res) => {
          const response = res.response.body
          checkStmtListWithTimeRange(response, 900)
        })

        // time rage will be remebered after reload page
        cy.reload()
        cy.get('[data-e2e=selected_timerange]').should(
          'have.text',
          'Recent 15 min'
        )
      })
    })
  })

  describe('Filter statements by changing database', () => {
    it('No database selected by default', () => {
      cy.get('[data-e2e=base_select_input_text]')
        .eq(0)
        .should('has.text', 'All Databases')
    })

    it('Show all databases', () => {
      cy.intercept(`${Cypress.env('apiBasePath')}info/databases`).as(
        'databases'
      )

      cy.wait('@databases').then((res) => {
        const databases = res.response.body
        testBaseSelectorOptions(databases, 'execution_database_name')
      })
    })

    it('Filter statements without use database', () => {
      cy.intercept(`${Cypress.env('apiBasePath')}info/databases`).as(
        'databases'
      )
      cy.intercept(`${Cypress.env('apiBasePath')}statements/list*`).as(
        'statements_list'
      )

      cy.wait('@databases').wait('@statements_list')

      // check all options in databases selector
      checkAllOptionsInBaseSelector('execution_database_name')

      // check the existence of statements without use database
      cy.wait('@statements_list')
      cy.contains(defaultExecStmtList[0]).should('not.exist')
      cy.contains(defaultExecStmtList[2]).should('not.exist')
    })

    it('Filter statements with use database (mysql)', () => {
      let queryData = {
        query: 'SELECT count(*) from user;',
        database: 'mysql'
      }
      cy.task('queryDB', { ...queryData })
      cy.reload()

      cy.intercept(`${Cypress.env('apiBasePath')}info/databases`).as(
        'databases'
      )
      cy.intercept(`${Cypress.env('apiBasePath')}statements/list*`).as(
        'statements_list'
      )

      cy.wait('@databases').wait('@statements_list')

      cy.get('[data-e2e=execution_database_name]')
        .eq(0)
        .click()
        .get('.ant-dropdown')
        .within(() => {
          cy.get('.ant-checkbox-input').eq(3).click()
        })

      cy.wait('@statements_list')
      cy.contains('SELECT count (?) FROM user;').should('exist')

      // Use databases config remembered
      cy.reload()
      cy.get('[data-e2e=base_select_input_text]')
        .eq(0)
        .should('has.text', '1 Databases')
    })
  })

  describe('Filter statements by changing kind', () => {
    it('No kind selected by default', () => {
      cy.get('[data-e2e=base_select_input_text]')
        .eq(1)
        .should('has.text', 'All Kinds')
    })

    it('Show all kind of statements', () => {
      cy.intercept(`${Cypress.env('apiBasePath')}statements/stmt_types`).as(
        'stmt_types'
      )

      cy.wait('@stmt_types').then((res) => {
        const stmtTypesList = res.response.body
        testBaseSelectorOptions(stmtTypesList, 'statement_types')
      })
    })

    it('Filter statements with all kind checked', () => {
      cy.intercept(`${Cypress.env('apiBasePath')}statements/stmt_types`).as(
        'stmt_types'
      )
      cy.intercept(`${Cypress.env('apiBasePath')}statements/list*`).as(
        'statements_list'
      )

      cy.wait(['@stmt_types', '@statements_list']).then((interceptions) => {
        // check all options in kind selector
        checkAllOptionsInBaseSelector('statement_types')
        const statementsList = interceptions[1].response.body
        cy.get('[data-e2e=syntax_highlighter_compact]').should(
          'have.length',
          statementsList.length
        )
      })
    })

    it('Filter statements with one kind checked (select)', () => {
      cy.intercept(`${Cypress.env('apiBasePath')}statements/stmt_types`).as(
        'stmt_types'
      )
      cy.intercept(`${Cypress.env('apiBasePath')}statements/list*`).as(
        'statements_list'
      )

      cy.wait('@stmt_types').wait('@statements_list')

      cy.get('[data-e2e=statement_types]')
        .click()
        .get('.ant-dropdown')
        .within(() => {
          cy.get('[data-e2e=multi_select_options]')
            .contains('Select')
            .click({ force: true })
        })

      cy.wait('@statements_list')
        .get('[data-e2e=syntax_highlighter_compact]')
        .each(($sql) => {
          cy.wrap($sql).contains('SELECT')
        })
    })
  })

  describe('Search function', () => {
    it('Default search text', () => {
      cy.get('[data-e2e=sql_statements_search]').should('be.empty')
    })

    it('Search item with space', () => {
      cy.intercept(`${Cypress.env('apiBasePath')}statements/list*`).as(
        'statements_list'
      )

      cy.wait('@statements_list')
      cy.get('[data-e2e=syntax_highlighter_compact]').contains('SHOW DATABASES')

      cy.get('[data-e2e=sql_statements_search]').type('SELECT version')

      cy.wait('@statements_list')
        .get('[data-e2e=syntax_highlighter_compact]')
        .contains('SELECT `version` ()')

      cy.get('[data-e2e=syntax_highlighter_compact]')
        .contains('SHOW DATABASES')
        .should('not.exist')

      // check search text remembered after reload page
      cy.reload()

      cy.wait('@statements_list')
      cy.get('[data-e2e=syntax_highlighter_compact]').contains(
        'SELECT `version` ()'
      )
      // this should be filtered away
      cy.get('[data-e2e=syntax_highlighter_compact]')
        .contains('SHOW DATABASES')
        .should('not.exist')
    })

    it('Type search then reload', () => {
      cy.intercept(`${Cypress.env('apiBasePath')}statements/list*`).as(
        'statements_list'
      )

      cy.wait('@statements_list')

      cy.get('[data-e2e=sql_statements_search]')
        .type('SELECT `version` ()')
        .wait('@statements_list')

      cy.reload()

      cy.wait('@statements_list').then((res) => {
        const statementsList = res.response.body
        cy.get('[data-e2e=syntax_highlighter_compact]').should(
          'has.length',
          statementsList.length
        )
      })
    })
  })

  describe('Selected Columns', () => {
    const defaultColumns = {
      digest_text: 'Statement Template ',
      sum_latency: 'Total Latency ',
      avg_latency: 'Mean Latency ',
      exec_count: '# Exec ',
      plan_count: '# Plans '
    }

    it('Default selected columns', () => {
      cy.get('[role=columnheader]')
        .not('.is-empty')
        .should('have.length', 5)
        .each(($column, idx) => {
          cy.wrap($column).contains(
            defaultColumns[Object.keys(defaultColumns)[idx]]
          )
        })
    })

    it('Hover on columns selector and check selected fields', () => {
      cy.get('[data-e2e=columns_selector_popover]')
        .trigger('mouseover')
        .then(() => {
          cy.get('[data-e2e=columns_selector_popover_content]')
            .should('be.visible')
            .within(() => {
              cy.get('.ant-checkbox-wrapper-checked')
                // .should('have.length', 5)
                .then(($options) => {
                  return Cypress.$.makeArray($options).map(
                    (option) => option.innerText
                  )
                })
                // make sure there exists the default executed statements
                .should('to.deep.eq', Object.values(defaultColumns))
            })
        })
    })

    it('Select all column fields', () => {
      cy.intercept(`${Cypress.env('apiBasePath')}statements/list*`).as(
        'statements_list'
      )

      cy.wait('@statements_list')

      cy.get('[data-e2e=columns_selector_popover]')
        .trigger('mouseover')
        .get('[data-e2e=column_selector_title]')
        .check()

      cy.wait('@statements_list')
        .get('[role=columnheader]')
        .not('.is-empty')
        .should('have.length', 43)

      // Columns should be remembered
      cy.reload()

      cy.wait('@statements_list')
        .get('[role=columnheader]')
        .not('.is-empty')
        .should('have.length', 43)
    })

    it('Reset selected column fields', () => {
      cy.intercept(`${Cypress.env('apiBasePath')}statements/list*`).as(
        'statements_list'
      )
      cy.wait('@statements_list')

      cy.get('[data-e2e=columns_selector_popover]')
        .trigger('mouseover')
        .get('[data-e2e=column_selector_title]')
        .check()

      cy.wait('@statements_list')
        .get('[role=columnheader]')
        .not('.is-empty')
        .should('have.length', 43)

      cy.get('[data-e2e=columns_selector_popover]')
        .trigger('mouseover')
        .get('[data-e2e=column_selector_reset]')
        .click()

      cy.wait('@statements_list')
        .get('[role=columnheader]')
        .not('.is-empty')
        .should('have.length', 5)
    })

    it('Select an arbitary column field', () => {
      cy.intercept(`${Cypress.env('apiBasePath')}statements/list*`).as(
        'statements_list'
      )
      cy.wait('@statements_list')

      cy.get('[data-e2e=columns_selector_popover]').trigger('mouseover')

      cy.contains('Total Coprocessor Tasks')
        .within(() => {
          cy.get('[data-e2e=columns_selector_field_sum_cop_task_num]').check()
        })
        .then(() => {
          cy.wait('@statements_list')
          cy.get('[data-item-key=sum_cop_task_num]').should(
            'have.text',
            'Total Coprocessor Tasks'
          )
        })

      // FIXME: the next contains should be performed over the popup only
      // cy.contains('Total Coprocessor Tasks')
      //   .within(() => {
      //     cy.get('[data-e2e=columns_selector_field_sum_cop_task_num]').uncheck()
      //   })
      //   .then(() => {
      //     cy.wait('@statements_list')
      //     cy.get('[data-item-key=sum_cop_task_num]').should('not.exist')
      //   })
    })

    it('Check SHOW_FULL_QUERY_TEXT', () => {
      cy.get('[data-e2e=columns_selector_popover]')
        .trigger('mouseover', { force: true })
        .then(() => {
          cy.get('[data-e2e=statement_show_full_sql]')
            .check()
            .then(() => {
              cy.get('[data-automation-key=digest_text]')
                .eq(0)
                .find('[data-e2e=syntax_highlighter_original]')
            })

          cy.get('[data-e2e=statement_show_full_sql]')
            .uncheck()
            .then(() => {
              cy.get('[data-automation-key=digest_text]')
                .eq(0)
                .trigger('mouseover', { force: true })
                .find('[data-e2e=syntax_highlighter_compact]')
            })
        })
    })
  })

  describe('Reload statement', () => {
    it('Reload statement table shows new query', () => {
      cy.intercept(`${Cypress.env('apiBasePath')}statements/list*`).as(
        'statements_list'
      )
      cy.wait('@statements_list')
      cy.get('[data-e2e=syntax_highlighter_compact]')
        .contains('SELECT count (?) FROM tidb')
        .should('not.exist')

      // send a query now
      let queryData = {
        query: 'select count(*) from tidb;',
        database: 'mysql'
      }
      cy.task('queryDB', { ...queryData })

      // refresh!
      cy.get('[data-e2e=sql_statements_search]').type('{enter}')
      cy.wait('@statements_list')
      cy.get('[data-e2e=syntax_highlighter_compact]').contains(
        'SELECT count (?) FROM tidb'
      )
    })
  })

  const calcStmtHistorySize = (refreshInterval, historySize) => {
    const totalMins = refreshInterval * historySize
    const day = Math.floor(totalMins / (24 * 60))
    const hour = Math.floor((totalMins - day * 24 * 60) / 60)
    const min = totalMins - day * 24 * 60 - hour * 60
    return `${day} day ${hour} hour ${min} min`
  }

  describe('Statement Setting', function () {
    it('Close setting panel', () => {
      // close panel by clicking mask
      cy.get('[data-e2e=statement_setting]')
        .click()
        .then(() => {
          cy.get('.ant-drawer-mask')
            .click()
            .then(() => {
              cy.get('.ant-drawer-content').should('not.be.visible')
            })
        })

      // close panel by clicking close icon
      cy.get('[data-e2e=statement_setting]')
        .click()
        .then(() => {
          cy.get('.ant-drawer-close')
            .click()
            .then(() => {
              cy.get('.ant-drawer-content').should('not.be.visible')
            })
        })
    })

    const switchStatement = (isCurrentlyEnabled) => {
      cy.get('[data-e2e=statement_setting]')
        .click()
        .then(() => {
          cy.get('.ant-drawer-content').should('exist')
          cy.get('[data-e2e=statemen_enbale_switcher]')
            // the current of switcher is isEnabled
            .should('have.attr', 'aria-checked', isCurrentlyEnabled)
            .click()
          cy.get('[data-e2e=submit_btn]').click()
        })
    }

    it('Disable statement feature', () => {
      switchStatement('true')
      cy.contains('Current statement history will be cleared.')
      cy.get('.ant-modal-confirm-btns').find('.ant-btn-dangerous').click()
      cy.get('[data-e2e=statements_table]').should('not.exist')
    })

    it('Save again when statement feature is disabled', () => {
      cy.get('[data-e2e=statement_setting]')
        .click()
        .then(() => {
          cy.get('.ant-drawer-content').should('exist')
          cy.get('[data-e2e=submit_btn]').click()
        })

      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(500)
      cy.contains('Current statement history will be cleared.').should(
        'not.exist'
      )
    })

    it('Enable statement feature', () => {
      switchStatement('false')
      cy.get('[data-e2e=statements_table]').should('exist')
    })

    describe('Default statement setting', () => {
      beforeEach(() => {
        cy.intercept(`${Cypress.env('apiBasePath')}statements/config`).as(
          'statements_config'
        )

        cy.get('[data-e2e=statement_setting]').click()

        // get refresh_interval value
        cy.get(`[data-e2e=statement_setting_refresh_interval]`).within(() => {
          cy.get('.ant-slider-handle')
            .invoke('attr', 'aria-valuenow')
            .as('refreshIntervalVal')
        })

        // get history_size value
        cy.get(`[data-e2e=statement_setting_history_size]`).within(() => {
          cy.get('.ant-slider-handle')
            .invoke('attr', 'aria-valuenow')
            .as('historySizeVal')
        })
      })

      const checkSilder = (sizeList, defaultValueNow, dataE2EValue) => {
        cy.wait('@statements_config').then(() => {
          cy.get(`[data-e2e=${dataE2EValue}]`).within(() => {
            cy.get('.ant-slider-handle').should(
              'have.attr',
              'aria-valuenow',
              defaultValueNow
            )

            cy.get('.ant-slider-mark-text')
              .then(($marks) => {
                return Cypress.$.makeArray($marks).map((mark) => mark.innerText)
              })
              // make sure there exists the default executed statements
              .should('to.deep.eq', sizeList)
          })
        })
      }

      it('Default statement setting max size', () => {
        const sizeList = ['200', '1000', '2000', '5000']
        const defaultMaxSizeValue =
          Cypress.env('TIDB_VERSION') === 'v5.0.0' ? '200' : '3000'
        checkSilder(sizeList, defaultMaxSizeValue, 'statement_setting_max_size')
      })

      it('Default statement setting window size', () => {
        const sizeList = ['1', '5', '15', '30', '60']
        checkSilder(sizeList, '30', 'statement_setting_refresh_interval')
      })

      it('Default Statement setting number of windows', () => {
        const sizeList = ['1', '255']
        checkSilder(sizeList, '24', 'statement_setting_history_size')
      })

      it('Default Check History Size', function () {
        const stmtHistorySize = calcStmtHistorySize(
          this.refreshIntervalVal,
          this.historySizeVal
        )
        cy.get('[data-e2e=statement_setting_keep_duration]').within(() => {
          cy.get('.ant-form-item-control-input-content').should(
            'have.text',
            stmtHistorySize
          )
        })
      })
    })

    describe('Update statement setting', function () {
      beforeEach(function () {
        cy.get('[data-e2e=statement_setting]').click()
      })

      it('Update window size and number of windows', function () {
        // change window size
        cy.get('[data-e2e=statement_setting_refresh_interval]').within(() => {
          cy.get('.ant-slider-step')
            .find('.ant-slider-dot')
            .eq(2)
            .click()
            .then(() => {
              cy.get('.ant-slider-handle')
                .invoke('attr', 'aria-valuenow')
                .as('refreshIntervalVal')
            })
        })

        // change number of windows
        cy.get('[data-e2e=statement_setting_history_size]').within(() => {
          cy.get('.ant-slider-step')
            .find('.ant-slider-dot')
            .eq(1)
            .click()
            .then(() => {
              cy.get('.ant-slider-handle')
                .invoke('attr', 'aria-valuenow')
                .as('historySizeVal')
            })
        })

        cy.get('@refreshIntervalVal').then((refreshIntervalVal) => {
          cy.get('@historySizeVal').then((historySizeVal) => {
            cy.get('[data-e2e=statement_setting_keep_duration]').within(() => {
              // check statement history size by calculating window size and # windows
              const stmtHistorySize = calcStmtHistorySize(
                refreshIntervalVal,
                historySizeVal
              )
              cy.get('.ant-form-item-control-input-content').should(
                'have.text',
                stmtHistorySize
              )
            })

            cy.intercept(
              'POST',
              `${Cypress.env('apiBasePath')}statements/config`
            ).as('update_config')
            cy.get('[data-e2e=submit_btn]').click()

            cy.wait('@update_config').then(() => {
              // check configuration whether come to effect or not
              cy.visit(this.uri.configuration)
              cy.url().should('include', this.uri.configuration)

              cy.get('[data-e2e=search_config]').type(
                'tidb_stmt_summary_refresh_interval'
              )
              // eslint-disable-next-line cypress/no-unnecessary-waiting
              cy.wait(1000)
              cy.get('[data-automation-key=key]').contains(
                'tidb_stmt_summary_refresh_interval'
              )
              cy.get('[data-automation-key=value]').contains(
                refreshIntervalVal * 60
              )

              cy.get('[data-e2e=search_config]')
                .clear()
                .type('tidb_stmt_summary_history_size')
              // eslint-disable-next-line cypress/no-unnecessary-waiting
              cy.wait(1000)
              cy.get('[data-automation-key=key]').contains(
                'tidb_stmt_summary_history_size'
              )
              cy.get('[data-automation-key=value]').contains(historySizeVal)
            })
          })
        })
      })

      it('Failed to save config list', () => {
        cy.on('uncaught:exception', function () {
          return false
        })

        const staticResponse = {
          statusCode: 400,
          body: {
            code: 'common.bad_request',
            error: true,
            message: 'common.bad_request'
          }
        }

        // stub out a response body
        cy.intercept(
          'POST',
          `${Cypress.env('apiBasePath')}statements/config`,
          staticResponse
        ).as('statements_config')
        cy.get('[data-e2e=submit_btn]').click()
        cy.wait('@statements_config').then(() => {
          // get error notifitcation on modal
          cy.get('.ant-modal-confirm-content').should(
            'has.text',
            staticResponse.body.message
          )
        })
      })
    })
  })

  describe('Simulate bad request', () => {
    beforeEach(() => {
      const staticResponse = {
        statusCode: 400,
        body: {
          code: 'common.bad_request',
          error: true,
          message: 'common.bad_request'
        }
      }

      // stub out a response body
      cy.intercept(
        `${Cypress.env('apiBasePath')}statements/config`,
        staticResponse
      ).as('failed_to_get_statements_config')

      cy.get('[data-e2e=statement_setting]').click()
    })

    it('Get config list bad request', () => {
      cy.wait('@failed_to_get_statements_config').then(() => {
        // get error alert on panel
        cy.get('.ant-drawer-body').within(() => {
          cy.get('[data-e2e=alert_error_bar]').should(
            'has.text',
            'common.bad_request'
          )
        })
      })
    })
  })

  describe('Slow network condition', () => {
    const slowNetworkText = 'On-the-fly update is disabled'

    it('Does not show slow information when network is fast', () => {
      cy.intercept(`${Cypress.env('apiBasePath')}statements/list*`).as(
        'statements_list'
      )

      cy.wait('@statements_list')

      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(500)
      cy.contains(slowNetworkText).should('not.exist')
    })

    it('Show slow information', () => {
      cy.intercept(`${Cypress.env('apiBasePath')}statements/list*`, (req) => {
        req.on('response', (res) => {
          res.setDelay(3000)
        })
      }).as('statements_list')

      cy.wait('@statements_list')
      cy.contains(slowNetworkText)
    })

    it('Does not send request automatically when network is slow', () => {
      cy.intercept(`${Cypress.env('apiBasePath')}statements/list*`, (req) => {
        req.on('response', (res) => {
          res.setDelay(3000)
        })
      }).as('statements_list')

      cy.wait('@statements_list')
      cy.contains(slowNetworkText)

      cy.get('[data-e2e=sql_statements_search]').type('SELECT version')

      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(1000)
      cy.get('[data-e2e=syntax_highlighter_compact]').contains('SHOW DATABASES')

      // request is sent only after a manual refresh
      cy.get('[data-e2e=sql_statements_search]').type('{enter}')
      cy.wait('@statements_list')
      cy.get('[data-e2e=syntax_highlighter_compact]').contains(
        'SELECT `version` ()'
      )
      cy.get('[data-e2e=syntax_highlighter_compact]')
        .contains('SHOW DATABASES')
        .should('not.exist')
    })

    it('Updates the info when network is no longer slow', () => {
      let shouldDelay = true
      cy.intercept(`${Cypress.env('apiBasePath')}statements/list*`, (req) => {
        req.on('response', (res) => {
          if (shouldDelay) {
            res.setDelay(3000)
          }
        })
      }).as('statements_list')

      cy.wait('@statements_list')
      cy.contains(slowNetworkText)
      cy.get('[data-e2e=syntax_highlighter_compact]')
        .contains('SHOW DATABASES')
        .then(() => {
          shouldDelay = false
        })

      cy.get('[data-e2e=sql_statements_search]').type('{enter}')
      cy.wait('@statements_list')

      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(500)
      cy.contains(slowNetworkText).should('not.exist')

      // On-the-fly request should be recovered
      cy.get('[data-e2e=sql_statements_search]').type('SELECT version')
      cy.wait('@statements_list')
      cy.get('[data-e2e=syntax_highlighter_compact]').contains(
        'SELECT `version` ()'
      )
      cy.get('[data-e2e=syntax_highlighter_compact]')
        .contains('SHOW DATABASES')
        .should('not.exist')
    })
  })

  describe('Export statement CSV ', () => {
    it('validate CSV File', () => {
      const downloadsFolder = Cypress.config('downloadsFolder')
      let downloadedFilename

      cy.get('[data-e2e=statement_export_menu]')
        .trigger('mouseover')
        .then(() => {
          cy.window()
            .document()
            .then(function (doc) {
              doc.addEventListener('click', () => {
                setTimeout(function () {
                  doc.location?.reload()
                }, 5000)
              })

              // Make sure the file exists
              cy.intercept(
                `${Cypress.env('apiBasePath')}statements/download?token=*`
              ).as('download_statement')

              cy.get('[data-e2e=statement_export_btn]').click()
            })
        })
        .then(() => {
          cy.wait('@download_statement').then((res) => {
            // join downloadFolder with CSV filename
            const filenameRegx = /"(.*)"/
            downloadedFilename = path.join(
              downloadsFolder,
              res.response.headers['content-disposition'].match(filenameRegx)[1]
            )

            cy.readFile(downloadedFilename, { timeout: 15000 })
              // parse CSV text into objects
              .then(neatCSV)
              .then(validateStatementCSVList)
          })
        })
    })
  })
})
