// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

import dayjs from 'dayjs'

describe('SlowQuery list page', () => {
  before(() => {
    cy.fixture('uri.json').then(function (uri) {
      this.uri = uri
    })
  })

  beforeEach(function () {
    cy.login('root')
    cy.visit(this.uri.slow_query)
    cy.url().should('include', this.uri.slow_query)
  })

  describe('Initialize slow query page', () => {
    it('Restart tiup', () => {
      cy.exec(
        `bash ../scripts/start_tiup.sh ${Cypress.env('TIDB_VERSION')} restart`,
        { log: true }
      )
    })

    it('Wait TiUP Playground', () => {
      cy.exec('bash ../scripts/wait_tiup_playground.sh 1 300 &> wait_tiup.log')
    })

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
        cy.get('[data-e2e=alert_error_bar] > span:nth-child(2)').should(
          'has.text',
          staticResponse.body.message
        )
      })
    })
  })

  describe('Filter slow query list', () => {
    it('Run workload', () => {
      let queryData = {
        query: 'SET tidb_slow_log_threshold = 500',
      }
      cy.task('queryDB', { ...queryData })

      const workloads = [
        'SELECT SLEEP(0.8);',
        'SELECT SLEEP(0.4);',
        'SELECT SLEEP(1);',
      ]

      const waitTwoSecond = (query, idx) =>
        new Promise((resolve) => {
          // run workload every 3 seconds
          setTimeout(() => {
            resolve(query)
          }, 3000 * idx)
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
              .unix(lastSlowQueryTimeStamp - 7)
              .format('YYYY-MM-DD HH:mm:ss')
            secondQueryTimeRangeStart = dayjs
              .unix(lastSlowQueryTimeStamp - 4)
              .format('YYYY-MM-DD HH:mm:ss')
            thirdQueryTimeRangeStart = dayjs
              .unix(lastSlowQueryTimeStamp - 1)
              .format('YYYY-MM-DD HH:mm:ss')
            thirdQueryTimeRangeEnd = dayjs
              .unix(lastSlowQueryTimeStamp + (3 - 1))
              .format('YYYY-MM-DD HH:mm:ss')
          }
        })
      })

      describe('Check slow query', () => {
        it('Check slow query in the 1st 3 seconds time range', () => {
          cy.get('[data-e2e=timerange-selector]')
            .click()
            .then(() => {
              cy.get('.ant-picker-range').click()
              cy.get('.ant-picker-input-active > input').type(
                `${firstQueryTimeRangeStart}{leftarrow}{leftarrow}{backspace}{enter}`
              )
              cy.get('.ant-picker-input-active > input').type(
                `${secondQueryTimeRangeStart}{leftarrow}{leftarrow}{backspace}{enter}`
              )
              cy.get('[data-automation-key=query]')
                .should('has.length', 1)
                .and('has.text', 'SELECT SLEEP(0.8);')
            })
        })

        it('Check slow query in the 2nd 3 seconds time range', () => {
          cy.get('[data-e2e=timerange-selector]')
            .click()
            .then(() => {
              cy.get('.ant-picker-range').click()
              cy.get('.ant-picker-input-active > input').type(
                `${secondQueryTimeRangeStart}{leftarrow}{leftarrow}{backspace}{enter}`
              )
              cy.get('.ant-picker-input-active > input').type(
                `${thirdQueryTimeRangeStart}{leftarrow}{leftarrow}{backspace}{enter}`
              )

              cy.get('[data-automation-key=query]').should('has.length', 0)
            })
        })

        it('Check slow query in the 3rd 3 seconds time range', () => {
          cy.get('[data-e2e=timerange-selector]')
            .click()
            .then(() => {
              cy.get('.ant-picker-range').click()
              cy.get('.ant-picker-input-active > input').type(
                `${thirdQueryTimeRangeStart}{leftarrow}{leftarrow}{backspace}{enter}`
              )
              cy.get('.ant-picker-input-active > input').type(
                `${thirdQueryTimeRangeEnd}{leftarrow}{leftarrow}{backspace}{enter}`
              )

              cy.get('[data-automation-key=query]')
                .should('has.length', 1)
                .and('has.text', 'SELECT SLEEP(1);')
            })
        })

        it('Check slow query in the latest 9 seconds time range', () => {
          cy.get('[data-e2e=timerange-selector]')
            .click()
            .then(() => {
              cy.get('.ant-picker-range').click()
              cy.get('.ant-picker-input-active > input').type(
                `${firstQueryTimeRangeStart}{leftarrow}{leftarrow}{backspace}{enter}`
              )
              cy.get('.ant-picker-input-active > input').type(
                `${thirdQueryTimeRangeEnd}{leftarrow}{leftarrow}{backspace}{enter}`
              )

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
          cy.get('[data-e2e=base_select_input]')
            .click()
            .then(() => {
              cy.get('[data-e2e=multi_select_options_label]').should(
                'have.length',
                databaseList.length
              )
            })
        })
      })
    })
  })

  describe('Available fields', () => {
    it('Show all available fields', () => {
      cy.intercept('/dashboard/api/slow_query/available_fields').as(
        'getAvailableFields'
      )
      cy.wait('@getAvailableFields')

      const availableFields = [
        'query',
        'digest',
        'instance',
        'db',
        'connection_id',
        'timestamp',

        'query_time',
        'parse_time',
        'compile_time',
        // 'rewrite_time',
        // 'preproc_subqueries_time',
        // 'optimize_time',
        'process_time',
        'memory_max',
        'disk_max',

        'txn_start_ts',
        'success',
        'is_internal',
        'index_names',
        'stats',
        'backoff_types',

        // 'wait_ts',
        // 'cop_time',
        // 'lock_keys_time',
        // 'write_sql_response_total',
        // 'exec_retry_time',
        // 'prev_stmt',
        // 'plan',
        'user',
        'host',

        'wait_time',
        'backoff_time',
        'get_commit_ts_time',
        'local_latch_wait_time',
        'prewrite_time',
        // 'wait_prewrite_binlog_time',
        'commit_time',
        'commit_backoff_time',
        'resolve_lock_time',

        'cop_proc_avg',
        // 'cop_proc_p90',
        // 'cop_proc_max',
        'cop_wait_avg',
        // 'cop_wait_p90',
        // 'cop_wait_max',
        'write_keys',
        'write_size',
        'prewrite_region',
        'txn_retry',
        'request_count',
        'process_keys',
        'total_keys',
        'cop_proc_addr',
        'cop_wait_addr',
        'rocksdb_delete_skipped_count',
        'rocksdb_key_skipped_count',
        'rocksdb_block_cache_hit_count',
        'rocksdb_block_read_count',
        'rocksdb_block_read_byte',
      ]

      cy.get('[data-e2e="columns_selector_popover"]').trigger('mouseover')
      availableFields.forEach((f) => {
        cy.log(f)
        cy.get(`[data-e2e="columns_selector_field_${f}"]`).should('exist')
      })
    })
  })
})
