// Copyright 2021 Suhaha
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

context('The Search Log Page', () => {
  beforeEach(() => {
    cy.fixture('config.json').as('config')
  })

  it('search correct logs', function () {
    cy.login().then(() => {
      cy.get('a#search_logs').click()

      // Fill keyword
      cy.get('[data-e2e="log_search_keywords"]').type('Welcome')

      // Deselect PD instance
      cy.get('[data-e2e="log_search_instances"]').click()
      cy.get('[data-e2e="log_search_instances_drop"] .ms-GroupHeader-title')
        .contains('PD')
        .click({ force: true })
      cy.get('[data-e2e="log_search_instances"]').click()

      // Start search
      cy.get('[data-e2e="log_search_submit"]').click()
    })
  })
})
