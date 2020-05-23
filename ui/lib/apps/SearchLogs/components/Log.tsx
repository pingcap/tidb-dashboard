import React, { useCallback, ReactElement } from 'react'
import { TextWrap, Pre } from '@lib/components'

import styles from './Styles.module.css'

interface LogProps {
  patterns: RegExp[]
  expanded: boolean
  log: string
}

function highlight(patterns: RegExp[], s: string) {
  const intervals: number[][] = []
  for (const pattern of patterns) {
    while (true) {
      const match = pattern.exec(s)
      if (!match || match.index >= pattern.lastIndex) {
        break
      }
      intervals.push([match.index, pattern.lastIndex])
    }
  }

  intervals.sort((a, b) => a[0] - b[0])
  const merged: number[][] = []
  for (const [start, end] of intervals) {
    const last = merged[merged.length - 1]
    if (merged.length === 0 || last[1] < start) {
      merged.push([start, end])
    } else {
      last[1] = Math.max(last[1], end)
    }
  }

  const res: ReactElement[] = []
  let offset = 0
  for (const [start, end] of merged) {
    res.push(
      React.createElement('span', { key: start }, s.slice(0, start - offset))
    )
    res.push(
      React.createElement(
        'mark',
        { key: end, className: styles.highlight },
        s.slice(start - offset, end - offset)
      )
    )
    s = s.slice(end - offset)
    offset = end
  }

  res.push(React.createElement('span', { key: 'last' }, s))
  return res
}

export default function Log({ patterns, log, expanded }: LogProps) {
  const hightlighted = highlight(patterns, log)
  const handleClick = useCallback((ev: React.MouseEvent<HTMLDivElement>) => {
    ev.stopPropagation()
  }, [])
  return (
    <TextWrap
      multiline={expanded}
      onClick={handleClick}
      className={styles.logText}
    >
      <Pre>{hightlighted}</Pre>
    </TextWrap>
  )
}
