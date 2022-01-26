// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

import dayjs from 'dayjs'

describe('SlowQuery list page', () => {
  before(() => {
    cy.fixture('uri.json').then(function (uri) {
      this.uri = uri
    })

    // Restart tiup
    cy.exec(
      `bash ../scripts/start_tiup.sh ${Cypress.env('TIDB_VERSION')} restart`,
      { log: true }
    )

    // Wait TiUP Playground
    cy.exec('bash ../scripts/wait_tiup_playground.sh 1 300 &> wait_tiup.log')
  })

  beforeEach(function () {
    cy.login('root')
    cy.visit(this.uri.slow_query)
    cy.url().should('include', this.uri.slow_query)
  })

  describe('Initialize slow query page', () => {
    it('Slow query side bar highlighted', () => {
      cy.get('[data-e2e=menu_item_slow_query]').should(
        'has.class',
        'ant-menu-item-selected'
      )
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
          message: 'common.bad_request',
        },
      }

      // stub out a response body
      cy.intercept(
        `${Cypress.env('apiUrl')}slow_query/list*`,
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
        'SELECT SLEEP(1);',
        'SELECT SLEEP(0.4);',
        'SELECT SLEEP(2);',
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
      const now = dayjs().unix()
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
        const options = {
          url: `${Cypress.env('apiUrl')}slow_query/list`,
          qs: {
            begin_time: now - 1800,
            desc: true,
            end_time: now + 100,
            fields: 'query,timestamp,query_time,memory_max',
            limit: 100,
            orderBy: 'timestamp',
          },
        }

        cy.request(options).as('slow_query')

        cy.get('@slow_query').then((response) => {
          defaultSlowQueryList = response.body
          if (defaultSlowQueryList.length > 0) {
            lastSlowQueryTimeStamp = defaultSlowQueryList[0].timestamp

            firstQueryTimeRangeStart = dayjs
              .unix(lastSlowQueryTimeStamp - 12)
              .format('YYYY-MM-DD HH:mm:ss')
            secondQueryTimeRangeStart = dayjs
              .unix(lastSlowQueryTimeStamp - 7)
              .format('YYYY-MM-DD HH:mm:ss')
            thirdQueryTimeRangeStart = dayjs
              .unix(lastSlowQueryTimeStamp - 2)
              .format('YYYY-MM-DD HH:mm:ss')
            thirdQueryTimeRangeEnd = dayjs
              .unix(lastSlowQueryTimeStamp + (5 - 2))
              .format('YYYY-MM-DD HH:mm:ss')
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
                .and('has.text', 'SELECT SLEEP(1);')
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
                .and('has.text', 'SELECT SLEEP(2);')
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
        cy.get('[data-e2e=base_select_input]').should('has.text', '')
      })

      const options = {
        url: `${Cypress.env('apiUrl')}info/databases/`,
      }

      it('Show all databases', () => {
        cy.request(options).as('databases')

        cy.get('@databases').then((response) => {
          const databaseList = response.body
          cy.get('[data-e2e=base_selector]')
            .click()
            .then(() => {
              cy.get('[data-e2e=multi_select_options]').should(
                'have.length',
                databaseList.length
              )
            })
        })
      })

      it('Run workload without use database', () => {
        let queryData = {
          query: 'SELECT sleep(0.5);',
          database: '',
        }
        cy.task('queryDB', { ...queryData })

        cy.wait(2000)
        cy.reload()
        // global and use database queries will be listed
        cy.get('[data-automation-key=query]').should('has.length', 3)

        cy.get('[data-e2e=base_select_input]')
          .click()
          .then(() => {
            cy.get('.ms-DetailsHeader-checkTooltip')
              .click()
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
        cy.get('[data-e2e=slow_query_search]')
          .type(' select sleep\\(1\\) {enter}')
          .then(() => {
            cy.get('[data-automation-key=query]').should('has.length', 1)
          })

        // clear search text
        cy.get('[data-e2e=slow_query_search]')
          .clear()
          .type('{enter}')
          .then(() => {
            cy.get('[data-automation-key=query]').should('has.length', 3)
          })
      })

      it('Type search without pressing enter then reload', () => {
        cy.get('[data-e2e=slow_query_search]').type(' select sleep\\(1\\)')

        cy.reload()
        cy.get('[data-automation-key=query]').should('has.length', 3)
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
        cy.get('[data-e2e=slow_query_limit_select]')
          .click()
          .then(() => {
            cy.get('[data-e2e=slow_query_limit_option]')
              .eq(1)
              .click()
              .then(() => {
                cy.get('[data-automation-key=query]').should('has.length', 3)
              })
          })
      })
    })

    describe('Selected Columns', () => {
      const defaultColumns = ['Query', 'Finish Time', 'Latency', 'Max Memory']
      const defaultColumnsKeys = [
        'query',
        'timestamp',
        'query_time',
        'memory_max',
      ]
      it('Default selected columns', () => {
        cy.get('[role=columnheader]')
          .not('.is-empty')
          .should('have.length', 4)
          .each(($column, $idx) => {
            cy.wrap($column).contains(defaultColumns[$idx])
          })
      })

      it('Hover selected columns', () => {
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

      it('Check all columns', () => {
        cy.get('[data-e2e=columns_selector_popover]')
          .trigger('mouseover')
          .then(() => {
            cy.get('[data-e2e=slow_query_schema_table_column_tile]')
              .check()
              .then(() => {
                cy.get('[role=columnheader]')
                  .not('.is-empty')
                  .should('have.length', 44)
              })
          })
      })

      it('Reset selected columns', () => {
        cy.get('[data-e2e=columns_selector_popover]')
          .trigger('mouseover')
          .then(() => {
            cy.get('[data-e2e=slow_query_schema_table_column_reset]')
              .click()
              .then(() => {
                cy.get('[role=columnheader]')
                  .not('.is-empty')
                  .should('have.length', 4)
              })
          })
      })

      it('Check orbitary column', () => {
        cy.get('[data-e2e=columns_selector_popover]')
          .trigger('mouseover')
          .then(() => {
            cy.contains('Max Disk')
              .within(() => {
                cy.get('[data-e2e=columns_selector_field_disk_max]').check()
              })
              .then(() => {
                cy.get('[role=columnheader]')
                  .not('.is-empty')
                  .last()
                  .should('have.text', 'Max Disk ')
              })
          })
      })

      it('Uncheck last select orbitary column', () => {
        cy.get('[data-e2e=columns_selector_popover]')
          .trigger('mouseover')
          .then(() => {
            cy.contains('Max Disk')
              .within(() => {
                cy.get('[data-e2e=columns_selector_field_disk_max]').uncheck()
              })
              .then(() => {
                cy.get('[role=columnheader]')
                  .eq(1)
                  .should('have.text', 'Finish Time ')
              })
          })
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
                  .find('[data-e2e=text_wrap_multiline]')
              })

            cy.get('[data-e2e=slow_query_show_full_sql]')
              .uncheck()
              .then(() => {
                cy.get('[data-automation-key=query]')
                  .eq(0)
                  .trigger('mouseover')
                  .find('[data-e2e=text_wrap_singleline_with_tooltip]')
              })
          })
      })
    })

    describe('Table list order', () => {
      it('Default order', () => {
        cy.get('[data-automation-key=timestamp]')
          .each(($query, $idx, $queries) => {
            cy.wrap($query).invoke('text').as(`time${$idx}`)
          })
          .then(() => {
            const time1 = dayjs(cy.get('@time1'))
            const time2 = dayjs(cy.get('@time2'))
            cy.get('@time0').should('be.gt', time1)
            cy.get('@time1').should('be.gt', time2)
          })
      })
    })

    it('Click refresh will update table list', () => {
      cy.get('[data-automation-key=query]').should('have.length', 3)

      const queryData = {
        query: 'SELECT sleep(0.6)',
      }

      cy.task('queryDB', { ...queryData })
      cy.wait(500)

      cy.get('[data-e2e=slow_query_refresh]')
        .click()
        .then(() => {
          cy.get('[data-automation-key=query]').should('have.length', 4)
        })
    })

    describe('Go to detail page', () => {
      it('', () => {
        cy.get('[data-automation-key=query]').eq(0).as('firstSlowQuery')
        cy.get('[data-automation-key=timestamp]')
          .eq(0)
          .as('firstSlowQueryTimeStamp')
        cy.get('[data-automationid=ListCell]')
          .eq(0)
          .click()
          .then(() => {})
      })
    })
  })
})
