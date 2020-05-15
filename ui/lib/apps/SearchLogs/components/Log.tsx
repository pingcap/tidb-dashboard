import React, { useCallback } from 'react'
import { TextWrap, Pre } from '@lib/components'

import styles from './Styles.module.css'

interface LogProps {
  expanded: boolean
  log: string
}

export default function Log({ log, expanded }: LogProps) {
  const handleClick = useCallback((ev: React.MouseEvent<HTMLDivElement>) => {
    ev.stopPropagation()
  }, [])
  return (
    <TextWrap
      multiline={expanded}
      onClick={handleClick}
      className={styles.logText}
    >
      <Pre>{log}</Pre>
    </TextWrap>
  )
}
