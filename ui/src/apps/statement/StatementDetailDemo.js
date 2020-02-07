import React from 'react'
import { StatementDetail } from './components'
import { useLocation } from 'react-router-dom'

// TODO
function fakeReq(res) {
  return new Promise((resolve, _reject) => {
    setTimeout(() => resolve(res), 2000)
  })
}

export default function StatementDetailDemo() {
  const sqlCategory = new URLSearchParams(useLocation().search).get(
    'sql_category'
  )

  function queryDetail(sqlCategory) {
    const res = {
      summary: {
        sql_category: sqlCategory,
        last_sql:
          'select name, name_number from table1 where class_number in ( 1,2,3 ) group by row order by name_number',
        last_time: '2019-10-10 13:01:03',
        schemas: ['schema1', 'schema2', 'schema3']
      },
      statis: {
        total_duration: 100,
        total_times: 100110,
        avg_affect_lines: 100010,
        avg_scan_lines: 1000
      },
      nodes: [
        {
          node: 'node-1',
          total_duration: 100,
          total_times: 100,
          avg_duration: 10,
          max_duration: 10,
          avg_cost_mem: 20,
          back_off_times: 200
        },
        {
          node: 'node-2',
          total_duration: 99,
          total_times: 100,
          avg_duration: 10,
          max_duration: 10,
          avg_cost_mem: 20,
          back_off_times: 200
        },
        {
          node: 'node-3',
          total_duration: 98,
          total_times: 100,
          avg_duration: 20,
          max_duration: 10,
          avg_cost_mem: 20,
          back_off_times: 200
        },
        {
          node: 'node-4',
          total_duration: 90,
          total_times: 100,
          avg_duration: 10,
          max_duration: 50,
          avg_cost_mem: 10,
          back_off_times: 200
        },
        {
          node: 'node-5',
          total_duration: 9,
          total_times: 100,
          avg_duration: 10,
          max_duration: 10,
          avg_cost_mem: 20,
          back_off_times: 10
        }
      ]
    }
    return fakeReq(res)
  }

  return sqlCategory ? (
    <StatementDetail onFetchDetail={queryDetail} sqlCategory={sqlCategory} />
  ) : (
    <p>No sql_category</p>
  )
}
