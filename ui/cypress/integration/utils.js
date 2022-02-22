/**
 * Delete the downloads folder to make sure the test has "clean"
 * slate before starting.
 */
export const deleteDownloadsFolder = () => {
  const downloadsFolder = Cypress.config('downloadsFolder')

  cy.task('deleteFolder', downloadsFolder)
}

/**
 * @param {string[]} list List parsed from CSV file
 */
export const validateCSVList = (list) => {
  expect(list).to.have.length(4)

  expect(list[0].query).to.equal('SELECT sleep(1.2);')
  expect(list[1].query).to.equal('SELECT sleep(1.5);')
  expect(list[2].query).to.equal('SELECT sleep(2);')
  expect(list[3].query).to.equal('SELECT sleep(1);')
}

export const restartTiUP = () => {
  // Restart tiup
  cy.exec(
    `bash ../scripts/start_tiup.sh ${Cypress.env('TIDB_VERSION')} restart`,
    { log: true }
  )

  // Wait TiUP Playground
  cy.exec('bash ../scripts/wait_tiup_playground.sh 1 300 &> wait_tiup.log')
}
