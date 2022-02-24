export const testBaseSelectorOptions = (optionsList, index) => {
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

export const checkAllOptionsInBaseSelector = (index) => {
  cy.get('[data-e2e=base_selector]')
    .eq(index)
    .click()
    .then(($selector) => {
      console.log('selector', $selector)
      cy.wrap($selector).within(() => {
        cy.get('[role=columnheader]')
          .click()
          .then(() => {
            cy.get('[data-e2e=multi_select_options]').each(($option) => {
              cy.wrap($option).should('be.checked')
            })
          })
      })
    })
}
