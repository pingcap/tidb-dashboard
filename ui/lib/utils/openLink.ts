import { NavigateFunction } from 'react-router'
import React from 'react'

export default function openLink(
  url: string,
  ev: React.MouseEvent<HTMLElement>,
  navigate: NavigateFunction
) {
  if (ev.metaKey || ev.altKey || ev.ctrlKey) {
    // open in a new tab
    window.open(`/#${url}`, '_blank')
  } else if (ev.shiftKey) {
    // open in a new window
    window.open(`/#${url}`)
  } else {
    navigate(url)
  }
}
