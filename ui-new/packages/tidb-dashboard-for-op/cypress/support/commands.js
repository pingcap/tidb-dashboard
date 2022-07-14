// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
Cypress.Commands.add('login', (username, password = '') => {
  // cy.login will be called inside beforeEach,
  // cy.session stores cookies and localStorage when user first login,
  // the cookies and localStorage will be reused in the feature beforeEach test.
  cy.session(
    [username, password],
    () => {
      // root login
      cy.visit('/')
      cy.get('[data-e2e=signin_submit]').click()

      // Wait for the post-login redirect to ensure that the
      // session actually exists to be cached
      cy.url().should('include', '/overview')
    },
    {
      validate() {
        cy.request('/whoami').its('status').should('eq', 200)
      }
    }
  )
})

// -- This will overwrite an existing command --
Cypress.Commands.overwrite('request', (originalFn, ...options) => {
  const optionsObject = options[0]
  const token = localStorage.getItem('dashboard_auth_token')

  if (!!token && optionsObject === Object(optionsObject)) {
    optionsObject.headers = {
      authorization: 'Bearer ' + token,
      ...optionsObject.headers
    }

    return originalFn(optionsObject)
  }

  return originalFn(...options)
})

// We overwrite the command, so it does not take a sceenshot if we run the tests inside the test runner
Cypress.Commands.overwrite(
  'matchImageSnapshot',
  (originalFn, snapshotName, options) => {
    if (Cypress.env('ALLOW_SCREENSHOT')) {
      originalFn(snapshotName, options)
    } else {
      cy.log(`Screenshot comparison is disabled`)
    }
  }
)

Cypress.Commands.add('getByTestId', (selector, ...args) => {
  return cy.get(`[data-e2e="${selector}"]`, ...args)
})

Cypress.Commands.add('getByTestIdLike', (selector, ...args) => {
  return cy.get(`[data-e2e*="${selector}"]`, ...args)
})

//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
