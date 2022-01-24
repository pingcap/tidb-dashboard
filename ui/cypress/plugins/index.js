/// <reference types="cypress" />
// ***********************************************************
// This example plugins/index.js can be used to load plugins
//
// You can change the location of this file or turn off loading
// the plugins file with the 'pluginsFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/plugins-guide
// ***********************************************************

// This function is called when a project is opened or re-opened (e.g. due to
// the project's config changing)

import mysql from 'mysql2'
import { addMatchImageSnapshotPlugin } from 'cypress-image-snapshot/plugin'
import codecovTaskPlugin from '@cypress/code-coverage/task'

function queryTestDB(query, password, database) {
  const dbConfig = {
    host: '127.0.0.1',
    port: '4000',
    user: 'root',
    database: database,
    password: password,
  }
  // creates a new mysql connection
  const connection = mysql.createConnection(dbConfig)
  // start connection to db
  connection.connect()
  // exec query + disconnect to db as a Promise
  return new Promise((resolve, reject) => {
    connection.query(query, (error, results) => {
      if (error) reject(error)
      else {
        connection.end()
        return resolve(results)
      }
    })
  })
}

/**
 * @type {Cypress.PluginConfig}
 */
// eslint-disable-next-line no-unused-vars
module.exports = (on, config) => {
  // `on` is used to hook into various events Cypress emits
  // `config` is the resolved Cypress config

  codecovTaskPlugin(on, config)
  addMatchImageSnapshotPlugin(on, config)

  config.baseUrl =
    (process.env.SERVER_URL || 'http://localhost:3001/dashboard') + '#'

  config.env.apiUrl = 'http://127.0.0.1:12333/dashboard/api/'

  // Usage: cy.task('queryDB', { ...queryData })
  on('task', {
    queryDB: ({ query, password = '', database = 'mysql' }) => {
      return queryTestDB(query, password, database)
    },
  })

  return config
}
