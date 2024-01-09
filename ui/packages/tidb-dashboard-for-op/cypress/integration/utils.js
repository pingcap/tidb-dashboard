// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

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
export const validateSlowQueryCSVList = (list) => {
  expect(list).to.have.length(4)

  // FIXME: this check makes it extremely hard for adding new tests.

  expect(list[0].query).to.equal('SELECT sleep(1.2);')
  expect(list[1].query).to.equal('SELECT sleep(1.5);')
  expect(list[2].query).to.equal('SELECT sleep(2);')
  expect(list[3].query).to.equal('SELECT sleep(1);')
}

export const validateStatementCSVList = (allStatementList) => {
  const defaultExecStmtList = [
    'show databases',
    'select distinct `stmt_type` from `information_schema` . `cluster_statements_summary_history` order by `stmt_type` asc',
    'select `version` ( )'
  ]

  const allStatementDigestText = []
  allStatementList.forEach((stmt) => {
    allStatementDigestText.push(stmt.digest_text)
  })
  expect(allStatementDigestText).to.include.members(defaultExecStmtList)
}

export const restartTiUP = () => {
  // Restart tiup
  cy.exec(
    `bash ../../../scripts/start_tiup.sh ${Cypress.env(
      'TIDB_VERSION'
    )} false restart`,
    { log: true }
  )

  // Wait TiUP Playground
  cy.exec(
    'bash ../../../scripts/wait_tiup_playground.sh 1 300 &> wait_tiup.log',
    {
      timeout: 300000
    }
  )
}
