// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

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
    .then(() => {
      if (cy.get('.ant-dropdown').should('exist')) {
        cy.get('.ant-dropdown').within(() => {
          cy.get('[role=columnheader]')
            .eq(0)
            .within(() => {
              cy.get('.ant-checkbox').click()
            })
        })
      }
    })
}
