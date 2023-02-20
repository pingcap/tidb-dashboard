import React, { useContext } from 'react'

import styles from './List.module.less'
import { IndexInsightListWithRegister, IndexInsightList } from '../../component'
import { SQLAdvisorContext } from '../../context'

export default function SQLAdvisorOverview() {
  const ctx = useContext(SQLAdvisorContext)

  return (
    <div className={styles.list_container}>
      {ctx?.registerUserDB ? (
        <IndexInsightListWithRegister />
      ) : (
        <IndexInsightList />
      )}
    </div>
  )
}
