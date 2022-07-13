describe('Slow query detail page E2E test', () => {
  before(() => {
    cy.fixture('uri.json').then(function (uri) {
      this.uri = uri
    })
  })

  beforeEach(function () {
    cy.login('root')
    cy.visit(this.uri.slow_query)
    cy.url().should('include', this.uri.slow_query)
    cy.intercept(`${Cypress.env('apiBasePath')}slow_query/detail?*`).as(
      'slow_query_detail'
    )

    cy.get('[data-automation-key=query]').eq(0).click()
  })

  describe('Query descriptions', () => {
    it('Check sql and default format', () => {
      // sql is collapsed by default
      cy.get('[data-e2e=expandText]').eq(0).should('have.text', 'Expand')
      cy.get('[data-e2e=statement_query_detail_page_query]')
        .eq(0)
        .find('[data-e2e=syntax_highlighter_compact]')
        .and('have.text', 'SELECT sleep(1.2);')
    })

    it('Expand sql', () => {
      // expand sql
      cy.get('[data-e2e=expandText]').eq(0).click()

      // sql is collapsed by default
      cy.get('[data-e2e=collapseText]').eq(0).should('have.text', 'Collapse')
      cy.get('[data-e2e=statement_query_detail_page_query]')
        .eq(0)
        .find('[data-e2e=syntax_highlighter_original]')
        .and('have.text', 'SELECT\n  sleep(1.2);')
    })

    it('Copy formatted sql to clipboard', () => {
      // Prompt alert when testing copy to clipboard on chromium-based browser
      // https://github.com/cypress-io/cypress/issues/2739
      cy.window().then((win) => {
        cy.stub(win, 'prompt').returns(win.prompt).as('copyToClipboardPrompt')
      })

      // cypress cannot simulate  copy to the clipboard event,
      // we need to use realClick to fire copy event.
      // Related desc: https://github.com/dmtrKovalenko/cypress-real-events#why
      cy.get('[data-e2e=copy_formatted_sql_to_clipboard]')
        .realClick()
        .then(() => {
          cy.task('getClipboard').should('eq', 'SELECT\n  sleep(1.2);')
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
          cy.task('getClipboard').should('eq', 'SELECT sleep(1.2);')
        })

      cy.get('[data-e2e=copied_success]').should('exist')
    })
  })

  describe('Plan descriptions', () => {
    it('Check sql and default format', () => {
      // sql is collapsed by default
      cy.get('[data-e2e=expandText]').eq(1).should('have.text', 'Expand')

      cy.wait('@slow_query_detail').then((res) => {
        const responseBody = res.response.body
        cy.get('[data-e2e=statement_query_detail_page_query]')
          .eq(1)
          .and('have.text', responseBody.plan)
      })
    })
  })

  describe('Detail tabs', () => {
    it('Check tabs list', () => {
      const tabList = ['Basic', 'Time', 'Coprocessor', 'Transaction']
      cy.get('[data-e2e=tabs]')
        .find('.ant-tabs-tab')
        .should('have.length', 4)
        .each(($tab, index) => {
          cy.wrap($tab).should('have.text', tabList[index])
        })
    })
  })

  describe('Detail table tabs', () => {
    it('Basic table rows count', () => {
      cy.get('.ms-List-cell').should('have.length', 14)
    })

    it('Time table rows count', () => {
      cy.get('.ant-tabs-tab').eq(1).click()
      cy.get('.ms-List-cell').should('have.length', 21)
    })

    it('Coprocessor table rows count', () => {
      cy.get('.ant-tabs-tab').eq(2).click()
      cy.get('.ms-List-cell').should('have.length', 10)
    })

    it('Transaction table rows count', () => {
      cy.get('.ant-tabs-tab').eq(3).click()
      cy.get('.ms-List-cell').should('have.length', 5)
    })
  })
})
