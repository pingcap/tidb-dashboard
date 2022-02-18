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
    cy.get('[data-automation-key=query]').eq(0).click()
  })

  describe('Query descriptions', () => {
    it('Check sql and default format', () => {
      // sql is collapsed by default
      cy.get('[data-e2e=expandText]').eq(0).should('have.text', 'Expand')
      cy.get('[data-e2e=slow_query_detail_page_query]')
        .eq(0)
        .find('[data-e2e=syntax_highlighter_compact]')
        .and('have.text', 'SELECT sleep(1.2);')
    })

    it('Copy formatted sql to clipboard', () => {
      cy.window().then((win) => {
        cy.stub(win, 'prompt').returns(win.prompt).as('copyToClipboardPrompt')
      })

      cy.get('[data-e2e=copy_formatted_sql_to_clipboard]')
        .realClick()
        .then(() => {
          cy.task('getClipboard').should('eq', 'SELECT\n  sleep(1.2);')
        })

      cy.get('[data-e2e=copy_original_sql_to_clipboard]')
        .realClick()
        .then(() => {
          cy.task('getClipboard').should('eq', 'SELECT sleep(1.2);')
        })
    })
  })
})
