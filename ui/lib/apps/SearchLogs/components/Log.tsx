import React from 'react'
import { useState } from 'react'
import { TextWrap, Pre } from '@lib/components'

interface LogProps {
  log: string
}

export default function Log({ log }: LogProps) {
  const [expanded, setExpanded] = useState<boolean>(false)

  const handleClick = () => {
    setExpanded(!expanded)
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
