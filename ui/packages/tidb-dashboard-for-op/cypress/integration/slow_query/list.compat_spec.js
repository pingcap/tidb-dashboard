// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.
import { skipOn } from '@cypress/skip-test'

describe('SlowQuery list compatibility test', () => {
  before(() => {
    cy.fixture('uri.json').then(function (uri) {
      this.uri = uri
    })
  })

  beforeEach(function () {
    cy.login('root')
    cy.visit(this.uri.slow_query)
    cy.url().should('include', this.uri.slow_query)
  })

  describe('Available fields', () => {
    skipOn(Cypress.env('FEATURE_VERSION') !== '6.0.0', () => {
      it('Show all available fields', () => {
        cy.intercept(
          `${Cypress.env('apiBasePath')}slow_query/available_fields`
        ).as('getAvailableFields')
        cy.wait('@getAvailableFields')

        const availableFields = [
          'query',
          'digest',
          'instance',
          'db',
          'connection_id',
          'timestamp',

          'query_time',
          'parse_time',
          'compile_time',
          'process_time',
          'memory_max',
          'disk_max',

          'txn_start_ts',
          'success',
          'is_internal',
          'index_names',
          'stats',
          'backoff_types',

          'user',
          'host',

          'wait_time',
          'backoff_time',
          'get_commit_ts_time',
          'local_latch_wait_time',
          'prewrite_time',
          'commit_time',
          'commit_backoff_time',
          'resolve_lock_time',

          'cop_proc_avg',
          'cop_wait_avg',
          'write_keys',
          'write_size',
          'prewrite_region',
          'txn_retry',
          'request_count',
          'process_keys',
          'total_keys',
          'cop_proc_addr',
          'cop_wait_addr',
          'rocksdb_delete_skipped_count',
          'rocksdb_key_skipped_count',
          'rocksdb_block_cache_hit_count',
          'rocksdb_block_read_count',
          'rocksdb_block_read_byte'
        ]

        cy.get('[data-e2e="columns_selector_popover"]').trigger('mouseover')
        availableFields.forEach((f) => {
          cy.get(`[data-e2e="columns_selector_field_${f}"]`).should('exist')
        })
      })
    })
  })
})
