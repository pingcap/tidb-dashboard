// @ts-check
const path = require('path')
// const neatCSV = require('neat-csv')

/**
 * Delete the downloads folder to make sure the test has "clean"
 * slate before starting.
 */
export const deleteDownloadsFolder = () => {
  const downloadsFolder = Cypress.config('downloadsFolder')

  cy.task('deleteFolder', downloadsFolder)
}

/**
 * @param {string} csv
 */
export const validateCsv = (csv) => {
  cy.wrap(csv).then(validateCsvList)
}

export const validateCsvList = (list) => {
  console.log('list is', list)
}

/**
 * @param {string} name File name in the downloads folder
 */
export const validateCsvFile = (name) => {
  const downloadsFolder = Cypress.config('downloadsFolder')
  const filename = path.join(downloadsFolder, name)

  cy.readFile(filename, 'utf8').then(validateCsv)
}
