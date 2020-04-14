import React from 'react'
import OriBar, { IBarProps } from './Bar'
import WithText from './WithText'

function Bar(props: IBarProps) {
  return <OriBar {...props} />
}
Bar.WithText = WithText

export default Bar
export { IBarProps }
export { IBarWithTextProps } from './WithText'
