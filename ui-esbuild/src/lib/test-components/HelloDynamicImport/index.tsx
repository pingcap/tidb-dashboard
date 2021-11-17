import React from 'react'

import styles from './style.module.less'

export default function HelloDynamicImport() {
  async function btnClick() {
    let say = await import('./say') // no need suffix
    say.hi() // Hello!
    say.bye() // Bye!
    say.default() // Module loaded (export default)!
  }

  return (
    <div className={styles['hello-di-container']}>
      <button onClick={btnClick}>Hello Dynamic Import</button>
    </div>
  )
}
