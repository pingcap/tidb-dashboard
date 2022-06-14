import * as d3 from 'd3'

import { DataTag } from './types'

export function tagUnit(tag: DataTag): string {
  switch (tag) {
    case 'integration':
      return 'bytes/min'
    case 'read_bytes':
      return 'bytes/min'
    case 'written_bytes':
      return 'bytes/min'
    case 'read_keys':
      return 'keys/min'
    case 'written_keys':
      return 'keys/min'
  }
}

export function withUnit(val: number): string {
  val = val || 0
  if (val > 1024 * 1024 * 1024) {
    return (val / 1024 / 1024 / 1024).toFixed(2) + ' G'
  } else if (val > 1024 * 1024) {
    return (val / 1024 / 1024).toFixed(2) + ' M'
  } else if (val > 1024) {
    return (val / 1024).toFixed(2) + ' K'
  } else {
    return val.toFixed(2)
  }
}

export function truncateString(str: string, len: number): string {
  if (str.length > len) {
    return (
      str.substr(0, len / 2 - 1) +
      '....' +
      str.substr(str.length - len / 2 + 1, str.length)
    )
  } else {
    return str
  }
}

export function clickToCopyBehavior(selection, map) {
  selection.each(function (d) {
    d3.select(this).on('click', () => {
      copyToClipboard(map(d))
    })
  })
}

function copyToClipboard(text: string) {
  const input = d3.select('body').append('input').attr('value', text)
  input.node()!.select()
  document.execCommand('copy')
  input.remove()
}

export function doEventsOnYield(generator): Promise<undefined> {
  return new Promise((resolve, reject) => {
    let g = generator()
    let advance = () => {
      try {
        let r = g.next()
        if (r.done) resolve(undefined)
      } catch (e) {
        reject(e)
      }
      setTimeout(advance, 0)
    }
    advance()
  })
}
