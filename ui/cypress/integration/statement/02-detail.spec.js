describe('Statement detail page E2E test', () => {
  before(() => {
    const workloads = [
      'DROP TABLE IF EXISTS mysql.t;',
      'CREATE TABLE `t` (`a` bigint(20) DEFAULT NULL, `b` bigint(20) DEFAULT NULL, `c` timestamp(6) DEFAULT CURRENT_TIMESTAMP(6), `d` varchar(50) DEFAULT NULL, UNIQUE KEY `idx0` (`a`), KEY `idx1` (`b`), KEY `idx2` (`b`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;',
      'select /*+ USE_INDEX(t, idx1) */ count(*)  from t where b < 100;',
      'select /*+ USE_INDEX(t, idx2) */ count(*)  from t where b < 100;',
    ]

    workloads.forEach((query) => {
      cy.task('queryDB', { query })
    })

    cy.fixture('uri.json').then(function (uri) {
      this.uri = uri
    })
  })

  beforeEach(function () {
    cy.login('root')
    cy.visit(this.uri.statement)
    cy.url().should('include', this.uri.statement)
    cy.intercept(`${Cypress.env('apiBasePath')}statement/detail?*`).as(
      'statement_detail'
    )

    cy.get('[data-automation-key=plan_count]')
      .contains(2)
      .eq(0)
      .click({ force: true })
  })

  describe('Statement Template', () => {
    it('Check sql and default format', () => {
      // sql is collapsed by default
      cy.get('[data-e2e=expandText]').eq(0).should('have.text', 'Expand')
      cy.get('[data-e2e=statement_query_detail_page_query]')
        .eq(0)
        .find('[data-e2e=syntax_highlighter_compact]')
        .and('have.text', 'SELECT count (?) FROM `t` WHERE `b` < ?;')
    })

    it('Expand sql', () => {
      // expand sql
      cy.get('[data-e2e=expandText]').eq(0).click({ force: true })

      // sql is collapsed by default
      cy.get('[data-e2e=collapseText]').eq(0).should('have.text', 'Collapse')
      cy.get('[data-e2e=statement_query_detail_page_query]')
        .eq(0)
        .find('[data-e2e=syntax_highlighter_original]')
        .and('have.text', 'SELECT\n  count (?)\nFROM\n  `t`\nWHERE\n  `b` < ?;')
    })

    it('Copy formatted sql to clipboard', () => {
      cy.window().then((win) => {
        cy.stub(win, 'prompt').returns(win.prompt).as('copyToClipboardPrompt')
      })

      cy.get('[data-e2e=copy_formatted_sql_to_clipboard]')
        .realClick()
        .then(() => {
          cy.task('getClipboard').should(
            'eq',
            'SELECT\n  count (?)\nFROM\n  `t`\nWHERE\n  `b` < ?;'
          )
        })

      cy.get('[data-e2e=copied_success]').should('exist')
    })

    it('Copy original sql to clipboard', () => {
      cy.window().then((win) => {
        cy.stub(win, 'prompt').returns(win.prompt).as('copyToClipboardPrompt')
      })

      cy.get('[data-e2e=copy_original_sql_to_clipboard]')
        .realClick()
        .then(() => {
          cy.task('getClipboard').should(
            'eq',
            'select count ( ? ) from `t` where `b` < ? ;'
          )
        })

      cy.get('[data-e2e=copied_success]').should('exist')
    })
  })

  describe('Query Template', () => {
    it('Check sql and default format', () => {
      // sql is collapsed by default
      cy.get('[data-e2e=expandText]').eq(1).should('have.text', 'Expand')

      cy.wait('@statement_detail').then((res) => {
        const responseBody = res.response.body
        cy.get('[data-e2e=statement_query_detail_page_query]')
          .eq(1)
          .and('have.text', responseBody.digest)
      })
    })
  })

  describe('Plans', () => {
    it('Has multiple execution plans', () => {
      cy.get('[data-e2e=statement_multiple_execution_plans]')
        .should('be.visible')
        .within(() => {
          cy.get('[data-automationid=ListCell]').should('have.length', 2)
        })
    })
  })

  describe('Detail tabs', () => {
    it('Check tabs list', () => {
      const tabList = [
        'Basic',
        'Time',
        'Coprocessor',
        'Transaction',
        'Slow Query',
      ]
      cy.get('[data-e2e=tabs]')
        .find('.ant-tabs-tab')
        .should('have.length', 5)
        .each(($tab, index) => {
          cy.wrap($tab).should('have.text', tabList[index])
        })
    })
  })

  describe('Detail table tabs', () => {
    it('Basic table rows count', () => {
      cy.get('[data-e2e=statement_pages_detail_tabs_basic]').within(() => {
        cy.get('.ms-List-cell').should('have.length', 13)
      })
    })

    it('Time table rows count', () => {
      cy.get('.ant-tabs-tab').eq(1).click({ force: true })

      cy.get('[data-e2e=statement_pages_detail_tabs_time]').within(() => {
        cy.get('.ms-List-cell').should('have.length', 12)
      })
    })

    it('Coprocessor table rows count', () => {
      cy.get('.ant-tabs-tab').eq(2).click({ force: true })

      cy.get('[data-e2e=statement_pages_detail_tabs_copr]').within(() => {
        cy.get('.ms-List-cell').should('have.length', 15)
      })
    })

    it('Transaction table rows count', () => {
      cy.get('.ant-tabs-tab').eq(3).click({ force: true })

      cy.get('[data-e2e=statement_pages_detail_tabs_txn]').within(() => {
        cy.get('.ms-List-cell').should('have.length', 10)
      })
    })

    it('Slow query table rows count', () => {
      cy.get('.ant-tabs-tab').eq(4).click({ force: true })

      cy.get('[data-e2e=detail_tabs_slow_query]').within(() => {
        cy.get('.ms-List-cell').should('have.length', 0)
      })
    })
  })
})
