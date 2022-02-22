export const checkBaseSelector = (optionsList, index) => {
  cy.get('[data-e2e=base_selector]')
    .eq(index)
    .click()
    .then(() => {
      cy.get('[data-e2e=multi_select_options]')
        .should('have.length', optionsList.length)
        .each(($option, $idx) => {
          cy.wrap($option).should('have.text', optionsList[$idx])
        })
    })
}
