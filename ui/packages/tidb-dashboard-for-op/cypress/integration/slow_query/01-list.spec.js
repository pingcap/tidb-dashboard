// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

import dayjs from 'dayjs'
import {
  restartTiUP,
  validateSlowQueryCSVList,
  deleteDownloadsFolder
} from '../utils'
import { testBaseSelectorOptions } from '../components'

const neatCSV = require('neat-csv')
const path = require('path')

describe('SlowQuery list page', () => {
  before(() => {
    cy.fixture('uri.json').then(function (uri) {
      this.uri = uri
    })

    // Restart tiup
    restartTiUP()

    deleteDownloadsFolder()
  })

  beforeEach(function () {
    cy.login('root')
    cy.visit(this.uri.slow_query)
    cy.url().should('include', this.uri.slow_query)
  })

  describe('Initialize slow query page', () => {
    it('Slow query side bar highlighted', () => {
      cy.get('[data-e2e=menu_item_slow_query]')
        .should('be.visible')
        .and('has.class', 'ant-menu-item-selected')
    })

    it('Has Toolbar', function () {
      cy.get('[data-e2e=slow_query_toolbar]').should('be.visible')
    })

    it('Get slow query bad request', () => {
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
        `${Cypress.env('apiBasePath')}slow_query/list*`,
        staticResponse
      ).as('slow_query_list')
      cy.wait('@slow_query_list').then(() => {
        cy.get('[data-e2e=alert_error_bar]').should(
          'has.text',
          staticResponse.body.message
        )
      })
    })
  })

  describe('Filter slow query list', () => {
    it('Run workload', () => {
      const workloads = [
        'SELECT sleep(1);',
        'SELECT sleep(0.4);',
        'SELECT sleep(2);'
      ]

      const waitTwoSecond = (query, idx) =>
        new Promise((resolve) => {
          // run workload every 5 seconds
          setTimeout(() => {
            resolve(query)
          }, 5000 * idx)
        })

      workloads.forEach((query, idx) => {
        cy.wrap(waitTwoSecond(query, idx)).then((query) => {
          // return a promise to cy.then() that
          // is awaited until it resolves
          cy.task('queryDB', { query })
        })
      })
    })

    describe('Filter slow query by changing time range', () => {
      let defaultSlowQueryList
      let lastSlowQueryTimeStamp
      let firstQueryTimeRangeStart,
        secondQueryTimeRangeStart,
        thirdQueryTimeRangeStart,
        thirdQueryTimeRangeEnd

      it('Default time range is 30 mins', () => {
        cy.get('[data-e2e=selected_timerange]').should(
          'has.text',
          'Recent 30 min'
        )
      })

      it('Show all slow_query', () => {
        cy.intercept(`${Cypress.env('apiBasePath')}slow_query/list*`).as(
          'slow_query'
        )

        cy.wait('@slow_query').then((res) => {
          defaultSlowQueryList = res.response.body

          if (defaultSlowQueryList.length > 0) {
            lastSlowQueryTimeStamp = defaultSlowQueryList[0].timestamp

            const calTimestamp = (timestampDiff) => {
              return dayjs
                .unix(lastSlowQueryTimeStamp - timestampDiff)
                .format('YYYY-MM-DD HH:mm:ss')
            }
            firstQueryTimeRangeStart = calTimestamp(12)
            secondQueryTimeRangeStart = calTimestamp(7)
            thirdQueryTimeRangeStart = calTimestamp(2)
            thirdQueryTimeRangeEnd = calTimestamp(-3)
          }
        })
      })

      describe('Check slow query', () => {
        it('Check slow query in the 1st 5 seconds time range', () => {
          cy.get('[data-e2e=timerange-selector]')
            .click()
            .then(() => {
              cy.get('.ant-picker-range').click()
              cy.get('.ant-picker-input-active').type(
                `${firstQueryTimeRangeStart}{leftarrow}{leftarrow}{backspace}{enter}`
              )
              cy.get('.ant-picker-input-active').type(
                `${secondQueryTimeRangeStart}{leftarrow}{leftarrow}{backspace}{enter}`
              )
            })
            .then(() => {
              cy.get('[data-automation-key=query]')
                .should('has.length', 1)
                .and('has.text', 'SELECT sleep(1);')
            })
        })

        it('Check slow query in the 2nd 5 seconds time range', () => {
          cy.get('[data-e2e=timerange-selector]')
            .click()
            .then(() => {
              cy.get('.ant-picker-range').click()
              cy.get('.ant-picker-input-active').type(
                `${secondQueryTimeRangeStart}{leftarrow}{leftarrow}{backspace}{enter}`
              )
              cy.get('.ant-picker-input-active').type(
                `${thirdQueryTimeRangeStart}{leftarrow}{leftarrow}{backspace}{enter}`
              )
            })
            .then(() => {
              cy.get('[data-automation-key=query]').should('has.length', 0)
            })
        })

        it('Check slow query in the 3rd 5 seconds time range', () => {
          cy.get('[data-e2e=timerange-selector]')
            .click()
            .then(() => {
              cy.get('.ant-picker-range').click()
              cy.get('.ant-picker-input-active').type(
                `${thirdQueryTimeRangeStart}{leftarrow}{leftarrow}{backspace}{enter}`
              )
              cy.get('.ant-picker-input-active').type(
                `${thirdQueryTimeRangeEnd}{leftarrow}{leftarrow}{backspace}{enter}`
              )
            })
            .then(() => {
              cy.get('[data-automation-key=query]')
                .should('has.length', 1)
                .and('has.text', 'SELECT sleep(2);')
            })
        })

        it('Check slow query in the latest 15 seconds time range', () => {
          cy.get('[data-e2e=timerange-selector]')
            .click()
            .then(() => {
              cy.get('.ant-picker-range').click()
              cy.get('.ant-picker-input-active').type(
                `${firstQueryTimeRangeStart}{leftarrow}{leftarrow}{backspace}{enter}`
              )
              cy.get('.ant-picker-input-active').type(
                `${thirdQueryTimeRangeEnd}{leftarrow}{leftarrow}{backspace}{enter}`
              )
            })
            .then(() => {
              cy.get('[data-automation-key=query]').should('has.length', 2)
            })
        })
      })
    })

    describe('Filter slow query by changing database', () => {
      it('No database selected by default', () => {
        cy.get('[data-e2e=base_select_input_text]').should(
          'has.text',
          'All Databases'
        )
      })

      it('Show all databases', () => {
        cy.intercept(`${Cypress.env('apiBasePath')}info/databases`).as(
          'databases'
        )

        cy.wait('@databases').then((res) => {
          const databaseList = res.response.body
          testBaseSelectorOptions(databaseList, 'execution_database_name')
        })
      })

      it('Run workload without use database', () => {
        let queryData = {
          query: 'SELECT sleep(1.5);',
          database: ''
        }
        cy.task('queryDB', { ...queryData })

        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.wait(2000)
        cy.reload()
        // global and use database queries will be listed
        cy.get('[data-automation-key=query]').should('has.length', 3)

        cy.get('[data-e2e=base_select_input_text]')
          .click({ force: true })
          .then(() => {
            cy.get('.ms-DetailsHeader-checkTooltip')
              .click({ force: true })
              .then(() => {
                // global query will not be listed
                cy.get('[data-automation-key=query]').should('has.length', 2)
              })
          })
      })
    })

    describe('Search function', () => {
      it('Default search text', () => {
        cy.get('[data-e2e=slow_query_search]').should('be.empty')
      })

      it('Search item with space', () => {
        cy.intercept(`${Cypress.env('apiBasePath')}slow_query/list*`).as(
          'slow_query_list'
        )
        cy.wait('@slow_query_list')

        cy.get('[data-e2e=slow_query_search]').type(
          ' SELECT sleep\\(1\\) {enter}'
        )

        cy.wait('@slow_query_list')
        cy.get('[data-automation-key=query]').should('has.length', 1)

        // clear search text
        cy.get('[data-e2e=slow_query_search]').clear().type('{enter}')

        cy.wait('@slow_query_list')
        cy.get('[data-automation-key=query]').should('has.length', 3)
      })

      it('Type search without pressing enter then reload', () => {
        cy.intercept(`${Cypress.env('apiBasePath')}slow_query/list*`).as(
          'slow_query_list'
        )
        cy.wait('@slow_query_list')

        cy.get('[data-e2e=slow_query_search]').type(' SELECT sleep\\(1\\)')
        cy.wait('@slow_query_list')
        cy.get('[data-automation-key=query]').should('has.length', 1)

        cy.reload()
        cy.get('[data-automation-key=query]').should('has.length', 1)
      })
    })

    describe('Slow query list limitation', () => {
      it('Default limit', () => {
        cy.get('[data-e2e=slow_query_limit_select]').contains('100')
      })

      const limitOptions = ['100', '200', '500', '1000']

      it('Check limit options', () => {
        cy.get('[data-e2e=slow_query_limit_select]')
          .click()
          .then(() => {
            cy.get('[data-e2e=slow_query_limit_option]')
              .should('have.length', 4)
              .each(($option, $idx) => {
                cy.wrap($option).contains(limitOptions[$idx])
              })
          })
      })

      it('Check config remembered', () => {
        cy.intercept(`${Cypress.env('apiBasePath')}slow_query/list*`).as(
          'slow_query_list'
        )
        cy.wait('@slow_query_list')

        cy.get('[data-e2e=slow_query_limit_select]').click()
        cy.get('[data-e2e=slow_query_limit_option]').eq(1).click()

        cy.wait('@slow_query_list')
        cy.reload()
        cy.get('[data-e2e=slow_query_limit_select]').contains('200')
      })
    })

    describe('Selected Columns', () => {
      const defaultColumns = ['Query', 'Finish Time', 'Latency', 'Max Memory']
      const defaultColumnsKeys = [
        'query',
        'timestamp',
        'query_time',
        'memory_max'
      ]
      it('Default selected columns', () => {
        cy.get('[role=columnheader]')
          .not('.is-empty')
          .should('have.length', 4)
          .each(($column, $idx) => {
            cy.wrap($column).contains(defaultColumns[$idx])
          })
      })

      it('Hover on columns selector and check selected fields ', () => {
        cy.get('[data-e2e=columns_selector_popover]')
          .trigger('mouseover')
          .then(() => {
            cy.get('[data-e2e=columns_selector_popover_content]')
              .should('be.visible')
              .within(() => {
                // check default selectedColumns checked
                defaultColumns.forEach((c, idx) => {
                  cy.contains(c)
                    .parent()
                    .within(() => {
                      cy.get(
                        `[data-e2e=columns_selector_field_${defaultColumnsKeys[idx]}]`
                      ).should('be.checked')
                    })
                })
              })
          })
      })

      it('Select all column fields and then reset', () => {
        cy.intercept(`${Cypress.env('apiBasePath')}slow_query/list*`).as(
          'slow_query_list'
        )
        cy.wait('@slow_query_list')

        cy.get('[data-e2e=columns_selector_popover]').trigger('mouseover')
        cy.get('[data-e2e=column_selector_title]').check()

        cy.wait('@slow_query_list')
        cy.get('[role=columnheader]').not('.is-empty').should('have.length', 44)

        // Columns should be remembered
        cy.reload()
        cy.wait('@slow_query_list')
        cy.get('[role=columnheader]').not('.is-empty').should('have.length', 44)

        // Click reset
        cy.get('[data-e2e=columns_selector_popover]').trigger('mouseover')
        cy.get('[data-e2e=column_selector_reset]').click()

        cy.wait('@slow_query_list')
        cy.get('[role=columnheader]').not('.is-empty').should('have.length', 4)
      })

      it('Select an arbitary column field', () => {
        cy.intercept(`${Cypress.env('apiBasePath')}slow_query/list*`).as(
          'slow_query_list'
        )
        cy.wait('@slow_query_list')

        cy.get('[data-e2e=columns_selector_popover]').trigger('mouseover')

        cy.contains('Max Disk').within(() => {
          cy.get('[data-e2e=columns_selector_field_disk_max]').check()
        })

        cy.wait('@slow_query_list')
        cy.get('[role=columnheader]')
          .not('.is-empty')
          .last()
          .should('have.text', 'Max Disk ')

        // FIXME: the next contains should be performed over the popup only
        // cy.contains('Max Disk').within(() => {
        //   cy.get('[data-e2e=columns_selector_field_disk_max]').uncheck()
        // })

        // cy.wait('@slow_query_list')
        // cy.get('[role=columnheader]').eq(1).should('have.text', 'Finish Time ')
      })

      it('Check SLOW_QUERY_SHOW_FULL_SQL', () => {
        cy.get('[data-e2e=columns_selector_popover]')
          .trigger('mouseover')
          .then(() => {
            cy.get('[data-e2e=slow_query_show_full_sql]')
              .check()
              .then(() => {
                cy.get('[data-automation-key=query]')
                  .eq(0)
                  .find('[data-e2e=syntax_highlighter_original]')
              })

            cy.get('[data-e2e=slow_query_show_full_sql]')
              .uncheck()
              .then(() => {
                cy.get('[data-automation-key=query]')
                  .eq(0)
                  .trigger('mouseover')
                  .find('[data-e2e=syntax_highlighter_compact]')
              })
          })
      })
    })
  })

  describe('Refresh table list', () => {
    it('Click refresh will update table list', () => {
      cy.intercept(`${Cypress.env('apiBasePath')}slow_query/list*`).as(
        'slow_query_list'
      )
      cy.wait('@slow_query_list')
      cy.contains('SELECT sleep(1.2)').should('not.exist')

      const queryData = {
        query: 'SELECT sleep(1.2)'
      }
      cy.task('queryDB', { ...queryData })
      cy.get('[data-e2e=slow_query_search]').type('{enter}')
      cy.wait('@slow_query_list')
      cy.contains('SELECT sleep(1.2)')
    })
  })

  describe('Table list order', () => {
    it('Default order(desc) by Timestamp', () => {
      const defaultOrderByTimestamp = [
        'SELECT sleep(1.2);',
        'SELECT sleep(1.5);',
        'SELECT sleep(2);',
        'SELECT sleep(1);'
      ]
      cy.get('[data-automation-key=query]').each(($query, $idx) => {
        cy.wrap($query).should('have.text', defaultOrderByTimestamp[$idx])
      })
    })

    it('Asc order by Timestamp', () => {
      const AscOrderByTimestamp = [
        'SELECT sleep(1);',
        'SELECT sleep(2);',
        'SELECT sleep(1.5);',
        'SELECT sleep(1.2);'
      ]

      cy.get('[data-item-key=timestamp]')
        .should('be.visible')
        .click()
        .then(() => {
          cy.get('[data-automation-key=query]').each(($query, $idx) => {
            cy.wrap($query).should('have.text', AscOrderByTimestamp[$idx])
          })
        })
    })

    it('Desc/Asc order by Latency', () => {
      const DescOrderByLatency = [
        'SELECT sleep(2);',
        'SELECT sleep(1.5);',
        'SELECT sleep(1.2);',
        'SELECT sleep(1);'
      ]

      cy.get('[data-item-key=query_time]')
        .should('be.visible')
        .click()
        .then(() => {
          // Desc order by Latency
          cy.get('[data-automation-key=query]').each(($query, $idx) => {
            cy.wrap($query).should('have.text', DescOrderByLatency[$idx])
          })
        })
        .then(() => {
          const AscOrderByLatency = [
            'SELECT sleep(1);',
            'SELECT sleep(1.2);',
            'SELECT sleep(1.5);',
            'SELECT sleep(2);'
          ]

          // Asc order by Latency
          cy.get('[data-item-key=query_time]')
            .should('be.visible')
            .click()
            .then(() => {
              cy.get('[data-automation-key=query]').each(($query, $idx) => {
                cy.wrap($query).should('have.text', AscOrderByLatency[$idx])
              })
            })
        })
    })
  })

  describe('Go to slow query detail page', () => {
    it('Click first slow query and go to detail page', function () {
      cy.get('[data-automationid=ListCell]')
        .eq(0)
        .click()
        .then(() => {
          cy.url().should('include', `${this.uri.slow_query}/detail`)
          cy.get('[data-e2e=syntax_highlighter_compact]').should(
            'have.text',
            'SELECT sleep(1.2);'
          )
        })
    })
  })

  // FIXME: The following tests will break slow-query details E2E since it executes a SQL.
  // Fix the slow-query details E2E first.

  // describe('Slow network condition', () => {
  //   const slowNetworkText = 'On-the-fly update is disabled'

  //   it('Does not show slow information when network is fast', () => {
  //     cy.intercept(`${Cypress.env('apiBasePath')}slow_query/list*`).as(
  //       'slow_query_list'
  //     )

  //     cy.wait('@slow_query_list')

  //     cy.wait(500)
  //     cy.contains(slowNetworkText).should('not.exist')
  //   })

  //   it('Show slow information', () => {
  //     cy.intercept(`${Cypress.env('apiBasePath')}slow_query/list*`, (req) => {
  //       req.on('response', (res) => {
  //         res.setDelay(3000)
  //       })
  //     }).as('slow_query_list')

  //     cy.wait('@slow_query_list')
  //     cy.contains(slowNetworkText)
  //   })

  //   it('Does not send request automatically when network is slow', () => {
  //     cy.intercept(`${Cypress.env('apiBasePath')}slow_query/list*`, (req) => {
  //       req.on('response', (res) => {
  //         res.setDelay(3000)
  //       })
  //     }).as('slow_query_list')

  //     cy.wait('@slow_query_list')
  //     cy.contains(slowNetworkText)

  //     const queryData = {
  //       query: 'SELECT 41212, sleep(1)',
  //     }
  //     cy.task('queryDB', { ...queryData })
  //     cy.reload()
  //     cy.wait('@slow_query_list')
  //     cy.contains(slowNetworkText)

  //     cy.get('[data-e2e=slow_query_search]').type('SELECT 41212')

  //     cy.wait(1000)
  //     cy.get('[data-e2e=syntax_highlighter_compact]').contains(
  //       'SELECT sleep(1.2)'
  //     ) // TODO: this depends on a previous test to finish..

  //     // request is sent only after a manual refresh
  //     cy.get('[data-e2e=slow_query_search]').type('{enter}')
  //     cy.wait('@slow_query_list')
  //     cy.get('[data-e2e=syntax_highlighter_compact]').contains('SELECT 41212')
  //     cy.get('[data-e2e=syntax_highlighter_compact]')
  //       .contains('SELECT sleep(1.2)')
  //       .should('not.exist')
  //   })

  //   it('Updates the info when network is no longer slow', () => {
  //     let shouldDelay = true
  //     cy.intercept(`${Cypress.env('apiBasePath')}slow_query/list*`, (req) => {
  //       req.on('response', (res) => {
  //         if (shouldDelay) {
  //           res.setDelay(3000)
  //         }
  //       })
  //     }).as('slow_query_list')

  //     cy.wait('@slow_query_list')
  //     cy.contains(slowNetworkText)
  //     cy.get('[data-e2e=syntax_highlighter_compact]')
  //       .contains('SELECT sleep(1.2)')
  //       .then(() => {
  //         shouldDelay = false
  //       })

  //     cy.get('[data-e2e=slow_query_search]').type('{enter}')
  //     cy.wait('@slow_query_list')

  //     cy.wait(500)
  //     cy.contains(slowNetworkText).should('not.exist')

  //     // On-the-fly request should be recovered
  //     cy.get('[data-e2e=slow_query_search]').type('SELECT 41212')
  //     cy.wait('@slow_query_list')
  //     cy.get('[data-e2e=syntax_highlighter_compact]').contains('SELECT 41212')
  //     cy.get('[data-e2e=syntax_highlighter_compact]')
  //       .contains('SELECT sleep(1.2)')
  //       .should('not.exist')
  //   })
  // })

  describe('Export slow query CSV ', () => {
    it('validate CSV File', () => {
      const downloadsFolder = Cypress.config('downloadsFolder')
      let downloadedFilename

      cy.get('[data-e2e=slow_query_export_menu]')
        .trigger('mouseover')
        .then(() => {
          cy.window()
            .document()
            .then(function (doc) {
              // Clicking link to download file causes page load timeout
              // it's a workround that fires a new page load event to skip this issue
              // Related issue: https://github.com/cypress-io/cypress/issues/14857
              doc.addEventListener('click', () => {
                setTimeout(function () {
                  doc.location?.reload()
                }, 5000)
              })

              // Make sure the file exists
              cy.intercept(
                `${Cypress.env('apiBasePath')}slow_query/download?token=*`
              ).as('download_slow_query')

              cy.get('[data-e2e=slow_query_export_btn]').click()
            })
        })
        .then(() => {
          cy.wait('@download_slow_query').then((res) => {
            // join downloadFolder with CSV filename
            const filenameRegx = /"(.*)"/
            downloadedFilename = path.join(
              downloadsFolder,
              res.response.headers['content-disposition'].match(filenameRegx)[1]
            )

            cy.readFile(downloadedFilename, { timeout: 15000 })
              // parse CSV text into objects
              .then(neatCSV)
              .then(validateSlowQueryCSVList)
          })
        })
    })
  })
})
