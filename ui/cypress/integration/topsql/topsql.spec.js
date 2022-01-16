// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

function setCustomTimeRange(timeRange) {
  cy.get('[data-e2e="timerange-selector"]').click()
  cy.get('.ant-picker.ant-picker-range').type(timeRange)
  cy.wait('@getTopsqlSummary')
  // ensure es-chart re-render
  cy.wait(1000)
}

function clearCustomTimeRange() {
  cy.get('[data-e2e="timerange-selector"]').click()
  cy.get('.ant-picker-clear').click()
  cy.wait(1000)
}

function enableTopSQL() {
  cy.get('[data-e2e="topsql-settings"]').click()
  cy.wait('@getTopsqlSettings')

  cy.get('[data-e2e="topsql-settings-enable"]').click()
  cy.get('[data-e2e="topsql-settings-save"]').click()
}

describe('Top SQL page', function () {
  beforeEach(() => {
    cy.fixture('uri.json').then((uri) => {
      cy.loginAndRedirect(uri.topsql)
    })

    cy.window().then((win) => win.sessionStorage.clear())
    cy.intercept('/dashboard/api/topsql/summary?*').as('getTopsqlSummary')
    cy.intercept('/dashboard/api/topsql/config').as('getTopsqlSettings')

    cy.wait('@getTopsqlSummary')
    cy.wait('@getTopsqlSettings').then((interception) => {
      if (!interception.response.body.enable) {
        enableTopSQL()
      }
    })
  })

  describe('Update time range', () => {
    it('baseline, custom the time range, chart displays the data within the time range', () => {
      setCustomTimeRange('2022-01-12 00:00:00{enter}2022-01-12 05:00:00{enter}')
      cy.get('.echCanvasRenderer').toMatchImageSnapshot()
    })

    it('zoom out the time range, chart displays the data that extends the 50% time range', () => {
      setCustomTimeRange('2022-01-12 00:00:00{enter}2022-01-12 05:00:00{enter}')

      cy.get('.anticon-zoom-out').click()
      cy.wait('@getTopsqlSummary')
        .its('request.url')
        .should(
          'include',
          `start=${new Date('2022-01-11 22:45:00').getTime() / 1000}`
        )
        .and(
          'include',
          `end=${new Date('2022-01-12 06:15:00').getTime() / 1000}`
        )
      cy.wait(1000)

      cy.get('[data-e2e="timerange-selector"]').contains(
        '01-11 22:45:00 ~ 01-12 06:15:00'
      )
      cy.get('.echCanvasRenderer').toMatchImageSnapshot()
    })
  })

  describe('Select instance', () => {
    // it('update the list of available instances according to the selected time range', function () {})

    it('change time range, keep the selected instance', () => {
      setCustomTimeRange('2022-01-12 00:00:00{enter}2022-01-12 05:00:00{enter}')
      cy.get('[data-e2e="instance-selector"]').contains(
        'tidb - 127.0.0.1:10080'
      )

      // No `tidb - 127.0.0.1:10080` data in the time range
      clearCustomTimeRange()
      setCustomTimeRange('2022-01-09 00:00:00{enter}2022-01-09 05:00:00{enter}')
      cy.get('[data-e2e="instance-selector"]').contains(
        'tidb - 127.0.0.1:10080'
      )
      cy.get('[data-e2e="instance-selector"]').click()
      // No instances available
      cy.get('.ant-select-dropdown-empty').should('have.length', 1)

      // There're `tidb - 127.0.0.1:10080` data in the time range
      clearCustomTimeRange()
      setCustomTimeRange('2022-01-12 00:00:00{enter}2022-01-12 05:00:00{enter}')
      cy.get('[data-e2e="instance-selector"]').contains(
        'tidb - 127.0.0.1:10080'
      )
      cy.get('[data-e2e="instance-selector"]').click()
      cy.get('.ant-select-dropdown').contains('127.0.0.1:10080')
    })
  })

  describe('Refresh', () => {
    it('click refresh button with the recent x time range, fetch the recent x time range data', () => {
      cy.get('[data-e2e="timerange-selector"]').click()
      cy.get('[data-e2e="timerange-300"]').click()

      const now = Date.now()
      cy.clock(now)
      cy.get('[data-e2e="auto-refresh-button"]').first().click()
      cy.wait('@getTopsqlSummary')
        .its('request.url')
        .should('include', `start=${(now / 1000 - 300).toFixed(0)}`)
        .and('include', `end=${(now / 1000).toFixed(0)}`)
    })

    it("click refresh button after custom the time range, the data won't change", () => {
      setCustomTimeRange('2022-01-12 00:00:00{enter}2022-01-12 05:00:00{enter}')

      cy.get('[data-e2e="auto-refresh-button"]').first().click()
      cy.wait('@getTopsqlSummary')
      cy.wait(1000)
      cy.get('.echCanvasRenderer').toMatchImageSnapshot()
    })

    it('set auto refresh, show auto refresh secs aside button', () => {
      cy.get('[data-e2e="auto-refresh-button"]').children().eq(1).click()
      cy.get('.ant-dropdown-menu-item').eq(1).click()
      cy.get('[data-e2e="auto-refresh-button"]').contains('30 s')
    })
  })

  describe('Chart and table', () => {
    it('when the time range is large, the chart interval is large', () => {
      setCustomTimeRange('2022-01-07 00:00:00{enter}2022-01-12 00:00:00{enter}')
      cy.get('.echCanvasRenderer').toMatchImageSnapshot()
    })

    it('when the time range is small, the chart interval is small', () => {
      setCustomTimeRange('2022-01-12 01:00:00{enter}2022-01-12 01:01:00{enter}')
      cy.get('.echCanvasRenderer').toMatchImageSnapshot()
    })

    it('the last item in the table list is others', () => {
      setCustomTimeRange('2022-01-12 00:00:00{enter}2022-01-12 05:00:00{enter}')
      cy.get('[data-e2e="topsql-list-table"] .ms-List-cell')
        .children()
        .eq(5)
        .find('[data-e2e="topsql-listtable-row-others"]')
    })

    it('table has top 5 records and the others record', () => {
      setCustomTimeRange('2022-01-12 00:00:00{enter}2022-01-12 05:00:00{enter}')

      cy.get('[data-e2e="topsql-list-table"] .ms-List-cell')
        .children()
        .should('have.length', 6)

      cy.get('[data-e2e="topsql-list-table"] .ms-List-cell').each((item) => {
        cy.wrap(item).trigger('mouseover')
        cy.get('.echCanvasRenderer').toMatchImageSnapshot()
      })
    })

    it('table can only be single selected', () => {
      setCustomTimeRange('2022-01-12 00:00:00{enter}2022-01-12 05:00:00{enter}')

      cy.get('[data-e2e="topsql-list-table"] .ms-List-cell').each((item) => {
        cy.wrap(item).click()
        cy.get(
          '[data-e2e="topsql-list-table"] .ms-DetailsRow-check[aria-checked="true"]'
        ).should('have.length', 1)
      })
    })
  })

  describe('Top SQL settings', () => {
    it('close Top SQL by settings panel, the chart and table will still work', () => {
      cy.get('[data-e2e="topsql-settings"]').click()
      cy.wait('@getTopsqlSettings')

      cy.get('[data-e2e="topsql-settings-enable"]').click()
      cy.get('[data-e2e="topsql-settings-save"]').click()
      cy.get('.ant-btn-primary.ant-btn-dangerous').click()
      cy.get('[data-e2e="topsql-not-enabled-alert"]').should('exist')

      setCustomTimeRange('2022-01-12 00:00:00{enter}2022-01-12 05:00:00{enter}')

      enableTopSQL()
      cy.wait('@getTopsqlSettings')
      cy.get('[data-e2e="topsql-not-enabled-alert"]').should('not.exist')
    })
  })

  describe('SQL statement details', () => {
    it('click one table row, show the list detail table and information contents', () => {
      setCustomTimeRange('2022-01-12 00:00:00{enter}2022-01-12 05:00:00{enter}')

      cy.get('[data-e2e="topsql-list-table"] .ms-List-cell').eq(0).click()
      cy.get('[data-e2e="topsql-listdetail-table"]').should('exist')
      cy.get('.e2e-topsql-listdetail-content-sql_text').should('exist')
      cy.get('.e2e-topsql-listdetail-content-sql_digest').should('exist')
      cy.get('.e2e-topsql-listdetail-content-plan_text').should('not.exist')
      cy.get('.e2e-topsql-listdetail-content-plan_digest').should('not.exist')
    })

    it('if the list detail table has more than one plan, only the real plans can be selected', () => {
      setCustomTimeRange('2022-01-12 00:00:00{enter}2022-01-12 05:00:00{enter}')

      cy.get('[data-e2e="topsql-list-table"] .ms-List-cell').eq(0).click()

      cy.get('[data-e2e="topsql-listdetail-table"] .ms-List-cell').eq(0).click()
      cy.get(
        '[data-e2e="topsql-listdetail-table"] .ms-DetailsRow-check[aria-checked="true"]'
      ).should('have.length', 0)

      cy.get('[data-e2e="topsql-listdetail-table"] .ms-List-cell').eq(1).click()
      cy.get(
        '[data-e2e="topsql-listdetail-table"] .ms-DetailsRow-check[aria-checked="true"]'
      ).should('have.length', 0)

      cy.get('[data-e2e="topsql-listdetail-table"] .ms-List-cell').eq(2).click()
      cy.get(
        '[data-e2e="topsql-listdetail-table"] .ms-DetailsRow-check[aria-checked="true"]'
      ).should('have.length', 1)
      cy.get('.e2e-topsql-listdetail-content-sql_text').should('exist')
      cy.get('.e2e-topsql-listdetail-content-sql_digest').should('exist')
      cy.get('.e2e-topsql-listdetail-content-plan_text').should('exist')
      cy.get('.e2e-topsql-listdetail-content-plan_digest').should('exist')
    })

    it("if there's only one plan in the list detail table, show the plan information directly", () => {
      setCustomTimeRange('2022-01-12 00:00:00{enter}2022-01-12 05:00:00{enter}')

      cy.get('[data-e2e="topsql-list-table"] .ms-List-cell').eq(1).click()

      cy.get('.e2e-topsql-listdetail-content-sql_text').should('exist')
      cy.get('.e2e-topsql-listdetail-content-sql_digest').should('exist')
      cy.get('.e2e-topsql-listdetail-content-plan_text').should('exist')
      cy.get('.e2e-topsql-listdetail-content-plan_digest').should('exist')
    })
  })
})
