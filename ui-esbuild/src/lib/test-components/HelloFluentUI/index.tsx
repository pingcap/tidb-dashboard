import React from 'react'
import { PrimaryButton, DatePicker } from '@fluentui/react'

import styles from './style.module.less'

export default function HelloFluentUI() {
  return (
    <div className={styles['hello-fluent-ui-container']}>
      <PrimaryButton>Hello Fluent UI</PrimaryButton>
      <DatePicker placeholder='Select a date...' ariaLabel='Select a date' />
    </div>
  )
}
