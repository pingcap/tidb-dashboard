import React from 'react'
import { PrimaryButton } from '@fluentui/react'

import styles from './style.module.less'

export default function HelloFluentUI() {
  return (
    <div className={styles['hello-fluent-ui-container']}>
      <PrimaryButton>Hello Fluent UI</PrimaryButton>
    </div>
  )
}
