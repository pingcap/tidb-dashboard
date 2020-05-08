import React from 'react'
import { TextWrap, Pre } from '@lib/components'
import { useToggle } from '@umijs/hooks'

interface LogProps {
  log: string
}

export default function Log({ log }: LogProps) {
  const { state: expanded, toggle: toggleExpanded } = useToggle(false)

  const handleClick = () => {
    toggleExpanded()
  }

  return (
    <TextWrap
      multiline={expanded}
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
    >
      <Pre>{log}</Pre>
    </TextWrap>
  )
}
