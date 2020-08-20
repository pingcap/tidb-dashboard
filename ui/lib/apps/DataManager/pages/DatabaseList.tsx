import React from 'react'
import { Link } from 'react-router-dom'
import { Space } from 'antd'

// route: /data
export default function DatabaseList() {
  return (
    <div>
      <h1>DatabaseListPage</h1>
      <Space>
        <Link to="/data/tables?db=test_db">Tables</Link>
        <Link to="/data/table_new?db=test_db">New Table</Link>
        <Link to="/data/table_detail?db=test_db&table=test_tl">
          TableDetail
        </Link>
        <Link to="/data/table_structure?db=test_db&table=test_tl">
          TableStructure
        </Link>
      </Space>
    </div>
  )
}
