import React from 'react'

import yaml from './test.yaml'

import styles from './style.module.less'

export default function HelloYAML() {
  return (
    <div className={styles['hello-yaml-container']}>
      <span>{yaml.hello.greeting}</span>
    </div>
  )
}
