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
import { rmdir } from 'fs'
import { addMatchImageSnapshotPlugin } from 'cypress-image-snapshot/plugin'
import codecovTaskPlugin from '@cypress/code-coverage/task'
import clipboardy from 'clipboardy'

function queryTestDB(query, password, database) {
  const dbConfig = {
    host: '127.0.0.1',
    port: '4000',
    user: 'root',
    database: database,
    password: password
  }
  // creates a new mysql connection
  const connection = mysql.createConnection(dbConfig)
  // exec query + disconnect to db as a Promise
  return new Promise((resolve, reject) => {
    connection.query(query, (error, results) => {
      setTimeout(() => {
        if (error) {
          reject(error)
        } else {
          connection.end()
          return resolve(results)
        }
      }, 500) // wait a few more moments for statements and slow query to finish.
    })
  })
}

function deleteTestFolder(folderPath) {
  return new Promise((resolve, reject) => {
    rmdir(folderPath, { maxRetries: 10, recursive: true }, (err) => {
      if (err && err.code !== 'ENOENT') {
        console.error(err)

        return reject(err)
      }

      resolve(null)
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

  config.env.apiBasePath = '/dashboard/api/'

  on('task', {
    // Usage: cy.task('queryDB', { ...queryData })
    queryDB: ({ query, password = '', database = 'mysql' }) => {
      return queryTestDB(query, password, database)
    },

    // Usage: cy.task('deleteFolder', deleteFolderPath)
    deleteFolder: (folderPath) => {
      return deleteTestFolder(folderPath)
    },

    // Usage: cy.task('getClipboard')
    getClipboard: () => {
      return clipboardy.readSync()
    }
  })

  return config
}
