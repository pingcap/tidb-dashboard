// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.
import dayjs from 'dayjs'
import { skipOn, onlyOn } from '@cypress/skip-test'

function setCustomTimeRange(timeRange) {
  if (!document.querySelector('[data-e2e="timerange_selector_dropdown"]')) {
    cy.getByTestId('timerange-selector').click()
  }
  cy.getByTestId('timerange_selector_dropdown').should('be.visible')

  cy.getByTestId('timerange_selector_dropdown')
    .find('.ant-picker.ant-picker-range')
    .type(timeRange)
  cy.getByTestId('timerange_selector_dropdown').should('be.not.visible')
}

function clearCustomTimeRange() {
  if (!document.querySelector('[data-e2e="timerange_selector_dropdown"]')) {
    cy.getByTestId('timerange-selector').click()
  }
  cy.getByTestId('timerange_selector_dropdown').should('be.visible')

  cy.getByTestId('timerange_selector_dropdown')
    .find('.ant-picker-clear')
    .click()
  cy.getByTestId('timerange_selector_dropdown').should('be.not.visible')
}

function enableTopSQL() {
  cy.getByTestId('topsql_settings').click()
  cy.wait('@getTopsqlConfig')

  cy.getByTestId('topsql_settings_enable').click()
  cy.getByTestId('topsql_settings_save').click()

  // confirm the tips which about the data will be delayed
  cy.get('.ant-modal-body').should('be.visible')
  cy.get('.ant-modal-body .ant-btn-primary').click()
}

skipOn(Cypress.env('TIDB_VERSION') !== 'latest', () => {
  describe('Top SQL page', function () {
    before(() => {
      cy.intercept(`${Cypress.env('apiBasePath')}/topsql/config`).as(
        'getTopsqlConfig'
      )

      cy.fixture('uri.json').then((uri) => {
        this.uri = uri

        cy.login('root')
        cy.visit(this.uri.topsql)

        cy.wait('@getTopsqlConfig').then((interception) => {
          if (!interception.response?.body.enable) {
            enableTopSQL()
          }
        })

        cy.visit(this.uri.overview)
      })
    })

    beforeEach(() => {
      cy.login('root')

      cy.intercept(`${Cypress.env('apiBasePath')}/topsql/config`).as(
        'getTopsqlConfig'
      )
      // mock summary and instance data from 2022-01-12 00:00:00 to 2022-01-12 05:00:00
      cy.intercept(`${Cypress.env('apiBasePath')}/topsql/summary?*`, {
        fixture:
          'topsql_summary:end=1641934800&instance=127.0.0.1%3A10080&instance_type=tidb&start=1641916800&top=5&window=123s.json'
      }).as('getTopsqlSummary')
      cy.intercept(
        {
          url: `${Cypress.env('apiBasePath')}/topsql/instances?*`
        },
        { fixture: 'topsql_instance:end=1641934800&start=1641916800.json' }
      )

      // clear the user preference before visit top sql page
      cy.window().then((win) => win.sessionStorage.clear())
      cy.visit(this.uri.topsql)

      // consume the first screen intercepted request when page loaded
      cy.wait('@getTopsqlSummary')
      cy.wait('@getTopsqlConfig')
    })

    describe('Update time range', () => {
      it('custom the time range, chart displays the data within the time range', () => {
        setCustomTimeRange(
          '2022-01-12 00:00:00{enter}2022-01-12 05:00:00{enter}'
        )

        cy.wait('@getTopsqlSummary')
        cy.getByTestId('topsql_list_chart').matchImageSnapshot()
      })

      it('zoom out the time range, chart displays the data that extends the 50% time range', () => {
        setCustomTimeRange(
          '2022-01-12 00:00:00{enter}2022-01-12 05:00:00{enter}'
        )
        cy.wait('@getTopsqlSummary')

        cy.get('.anticon-zoom-out').click()

        cy.getByTestId('timerange-selector').should(
          'contain',
          '01-11 21:30:00 ~ 01-12 07:30:00'
        )
        cy.getByTestId('topsql_list_chart').matchImageSnapshot()
      })
    })

    describe('Select instance', () => {
      it('default time range with instance', () => {
        setCustomTimeRange(
          '2022-01-12 00:00:00{enter}2022-01-12 05:00:00{enter}'
        )
        cy.wait('@getTopsqlSummary')

        cy.getByTestId('instance-selector').should(
          'contain',
          'tidb - 127.0.0.1:10080'
        )
      })

      it('change time range, keep the selected instance', () => {
        setCustomTimeRange(
          '2022-01-12 00:00:00{enter}2022-01-12 05:00:00{enter}'
        )
        cy.wait('@getTopsqlSummary')

        cy.getByTestId('instance-selector').should(
          'contain',
          'tidb - 127.0.0.1:10080'
        )

        // No `tidb - 127.0.0.1:10080` data in the time range
        clearCustomTimeRange()
        cy.wait('@getTopsqlSummary')

        setCustomTimeRange(
          '1970-01-01 08:00:00{enter}1970-01-01 09:00:00{enter}'
        )
        cy.wait('@getTopsqlSummary')

        cy.getByTestId('instance-selector').should(
          'contain',
          'tidb - 127.0.0.1:10080'
        )
      })
    })

    describe('Refresh', () => {
      it('click refresh button with the recent x time range, fetch the recent x time range data', () => {
        cy.getByTestId('timerange-selector').click()
        cy.getByTestId('timerange_selector_dropdown').should('be.visible')

        const recent = 300
        const now = dayjs().unix()
        cy.clock(now * 1000)

        cy.getByTestId(`timerange-${recent}`).click({ force: true })
        cy.wait('@getTopsqlSummary')
          .its('request.url')
          .should('include', `start=${now - recent}`)

        cy.getByTestId('auto-refresh-button').first().click()
        cy.wait('@getTopsqlSummary')
          .its('request.url')
          .should('include', `start=${now - recent}`)
      })

      it("click refresh button after custom the time range, the data won't change", () => {
        setCustomTimeRange(
          '2022-01-12 00:00:00{enter}2022-01-12 05:00:00{enter}'
        )
        cy.wait('@getTopsqlSummary')

        cy.getByTestId('auto-refresh-button').first().click()
        cy.getByTestId('timerange-selector').should(
          'contain',
          '01-12 00:00:00 ~ 01-12 05:00:00'
        )
        cy.wait('@getTopsqlSummary')
        cy.getByTestId('topsql_list_chart').matchImageSnapshot()
      })

      it('set auto refresh, show auto refresh secs aside button', () => {
        cy.getByTestId('auto-refresh-button').children().eq(1).click()
        cy.getByTestId('auto_refresh_time_30').click()
        cy.getByTestId('auto-refresh-button').should('contain', '30 s')
      })

      it('set auto refresh, it will be refreshed automatically after the time', () => {
        cy.getByTestId('auto-refresh-button').children().eq(1).click()
        cy.getByTestId('auto_refresh_time_30').should('be.visible')
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.wait(1000) // wait auto_refresh_time_30 item can be clicked before clock freeze the animate

        cy.clock()
        cy.getByTestId('auto_refresh_time_30').click()
        for (let i = 0; i < 35; i++) {
          cy.tick(1000)
          // eslint-disable-next-line cypress/no-unnecessary-waiting
          cy.wait(0) // yield to react hooks
        }
        cy.clock().invoke('restore')
        cy.wait('@getTopsqlSummary')
          .its('response.statusCode')
          .should('eq', 200)
      })
    })

    describe('Chart and table', () => {
      it('when the time range is large, the chart interval is large', () => {
        cy.intercept(`${Cypress.env('apiBasePath')}/topsql/summary?*`, {
          fixture:
            'topsql_summary_large_timerange:end=1641916800&instance=127.0.0.1%3A10080&instance_type=tidb&start=1641484800&top=5&window=2929s.json'
        }).as('getTopsqlSummaryLargeTimerange')

        setCustomTimeRange(
          '2022-01-07 00:00:00{enter}2022-01-12 00:00:00{enter}'
        )
        cy.wait('@getTopsqlSummaryLargeTimerange')

        cy.getByTestId('topsql_list_chart').matchImageSnapshot()
      })

      it('when the time range is small, the chart interval is small', () => {
        cy.intercept(`${Cypress.env('apiBasePath')}/topsql/summary?*`, {
          fixture:
            'topsql_summary_small_timerange:end=1641920460&instance=127.0.0.1%3A10080&instance_type=tidb&start=1641920400&top=5&window=1s.json'
        }).as('getTopsqlSummarySmallTimerange')

        setCustomTimeRange(
          '2022-01-12 01:00:00{enter}2022-01-12 01:01:00{enter}'
        )
        cy.wait('@getTopsqlSummarySmallTimerange')

        cy.getByTestId('topsql_list_chart').matchImageSnapshot()
      })

      it('the last item in the table list is others', () => {
        setCustomTimeRange(
          '2022-01-12 00:00:00{enter}2022-01-12 05:00:00{enter}'
        )
        cy.wait('@getTopsqlSummary')

        cy.getByTestId('topsql_list_table')
          .find('.ms-List-cell')
          .children()
          .eq(5)
          .find('[data-e2e="topsql_listtable_row_others"]')
      })

      it('table has top 5 records and the others record', () => {
        setCustomTimeRange(
          '2022-01-12 00:00:00{enter}2022-01-12 05:00:00{enter}'
        )
        cy.wait('@getTopsqlSummary')

        cy.getByTestId('topsql_list_table')
          .find('.ms-List-cell')
          .children()
          .should('have.length', 6)

        cy.getByTestId('topsql_list_table')
          .find('.ms-List-cell')
          .each((item, index) => {
            cy.wrap(item).trigger('mouseover')
            cy.getByTestId('topsql_list_chart').matchImageSnapshot(
              `Top SQL page -- Chart and table -- table has top 5 records and the others record - ${index}`
            )
          })
      })

      it('table can only be single selected', () => {
        setCustomTimeRange(
          '2022-01-12 00:00:00{enter}2022-01-12 05:00:00{enter}'
        )
        cy.wait('@getTopsqlSummary')

        cy.getByTestId('topsql_list_table')
          .find('.ms-List-cell')
          .each((item) => {
            cy.wrap(item).click()
            cy.getByTestId('topsql_list_table')
              .find('.ms-DetailsRow-check[aria-checked="true"]')
              .should('have.length', 1)
          })
      })
    })

    describe('Top SQL settings', () => {
      it('close Top SQL by settings panel, the chart and table will still work', () => {
        cy.getByTestId('topsql_settings').click()
        cy.wait('@getTopsqlConfig')

        cy.getByTestId('topsql_settings_enable').click()
        cy.getByTestId('topsql_settings_save').click()
        cy.get('.ant-btn-primary.ant-btn-dangerous').click()
        cy.getByTestId('topsql_not_enabled_alert').should('exist')

        setCustomTimeRange(
          '2022-01-12 00:00:00{enter}2022-01-12 05:00:00{enter}'
        )
        cy.wait('@getTopsqlSummary')
          .its('response.statusCode')
          .should('eq', 200)

        enableTopSQL()
        cy.wait('@getTopsqlConfig')
        cy.getByTestId('topsql_not_enabled_alert').should('not.exist')
      })
    })

    describe('SQL statement details', () => {
      it('click one table row, show the list detail table and information contents', () => {
        setCustomTimeRange(
          '2022-01-12 00:00:00{enter}2022-01-12 05:00:00{enter}'
        )
        cy.wait('@getTopsqlSummary')

        cy.getByTestId('topsql_list_table').find('.ms-List-cell').eq(0).click()
        cy.getByTestId('topsql_listdetail_table').should('exist')

        // content
        cy.getByTestId('sql_text').should('exist')
        cy.getByTestId('sql_digest').should('exist')
        cy.getByTestId('plan_text').should('not.exist')
        cy.getByTestId('plan_digest').should('not.exist')

        // table columns
        cy.get('[data-item-key="cpuTime"]').should('exist')
        cy.get('[data-item-key="plan"]').should('exist')
        cy.get('[data-item-key="exec_count_per_sec"]').should('exist')
        cy.get('[data-item-key="latency"]').should('exist')
      })

      it('if the list detail table has more than one plan, only the real plans can be selected', () => {
        setCustomTimeRange(
          '2022-01-12 00:00:00{enter}2022-01-12 05:00:00{enter}'
        )
        cy.wait('@getTopsqlSummary')

        cy.getByTestId('topsql_list_table').find('.ms-List-cell').eq(0).click()

        cy.getByTestId('topsql_listdetail_table')
          .find('.ms-List-cell')
          .eq(0)
          .click()
        cy.getByTestId('topsql_listdetail_table')
          .find('.ms-DetailsRow-check[aria-checked="true"]')
          .should('have.length', 0)

        cy.getByTestId('topsql_listdetail_table')
          .find('.ms-List-cell')
          .eq(1)
          .click()
        cy.getByTestId('topsql_listdetail_table')
          .find('.ms-DetailsRow-check[aria-checked="true"]')
          .should('have.length', 0)

        cy.getByTestId('topsql_listdetail_table')
          .find('.ms-List-cell')
          .eq(2)
          .click()
        cy.getByTestId('topsql_listdetail_table')
          .find('.ms-DetailsRow-check[aria-checked="true"]')
          .should('have.length', 1)
        cy.getByTestId('sql_text').should('exist')
        cy.getByTestId('sql_digest').should('exist')
        cy.getByTestId('plan_text').should('exist')
        cy.getByTestId('plan_digest').should('exist')
      })

      it("if there's only one plan in the list detail table, show the plan information directly", () => {
        setCustomTimeRange(
          '2022-01-12 00:00:00{enter}2022-01-12 05:00:00{enter}'
        )
        cy.wait('@getTopsqlSummary')

        cy.getByTestId('topsql_list_table').find('.ms-List-cell').eq(1).click()

        cy.getByTestId('sql_text').should('exist')
        cy.getByTestId('sql_digest').should('exist')
        cy.getByTestId('plan_text').should('exist')
        cy.getByTestId('plan_digest').should('exist')
      })
    })
  })
})

onlyOn(Cypress.env('TIDB_VERSION') === '5.0.0', () => {
  describe('Ngm not supported', function () {
    before(() => {
      cy.fixture('uri.json').then((uri) => (this.uri = uri))
    })

    beforeEach(() => {
      cy.login('root')
    })

    it('can not see top sql menu', () => {
      cy.getByTestId('menu_item_topsql').should('not.exist')
    })
  })
})
