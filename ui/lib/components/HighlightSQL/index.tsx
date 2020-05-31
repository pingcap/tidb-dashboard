import React, { useState, useEffect, useMemo } from 'react'

import { Light as SyntaxHighlighter } from 'react-syntax-highlighter'
import sql from 'react-syntax-highlighter/dist/esm/languages/hljs/sql'
import lightTheme from 'react-syntax-highlighter/dist/esm/styles/hljs/atom-one-light'
import darkTheme from 'react-syntax-highlighter/dist/esm/styles/hljs/atom-one-dark-reasonable'
import Pre from '../Pre'
import formatSql from '@lib/utils/formatSql'
import moize from 'moize'
import {
  darkmodeEnabled,
  subscribeToggleDarkMode,
} from '@lib/utils/themeSwitch'

SyntaxHighlighter.registerLanguage('sql', sql)

interface Props {
  sql: string
  compact?: boolean
  theme?: 'dark' | 'light'
}

function simpleSqlMinify(str) {
  return str
    .replace(/\s{1,}/g, ' ')
    .replace(/\{\s{1,}/g, '{')
    .replace(/\}\s{1,}/g, '}')
    .replace(/;\s{1,}/g, ';')
    .replace(/\/\*\s{1,}/g, '/*')
    .replace(/\*\/\s{1,}/g, '*/')
}

function HighlightSQL({ sql, compact }: Props) {
  const formattedSql = useMemo(() => {
    let f = formatSql(sql)
    if (compact) {
      f = simpleSqlMinify(f)
    }
    return f
  }, [sql, compact])
  const [darkMode, setDarkMode] = useState(darkmodeEnabled())
  useEffect(() => {
    const sub = subscribeToggleDarkMode((e) => {
      setDarkMode(e)
    })
    return () => sub.unsubscribe()
  }, [])

  return (
    <SyntaxHighlighter
      language="sql"
      style={darkMode ? darkTheme : lightTheme}
      customStyle={{
        background: 'none',
        padding: 0,
        overflowX: 'hidden',
      }}
      PreTag={Pre}
    >
      {formattedSql}
    </SyntaxHighlighter>
  )
}

export default moize.react(HighlightSQL, {
  isDeepEqual: true,
  maxSize: 1000,
})
