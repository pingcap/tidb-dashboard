import React, { useState, useMemo } from 'react'
import { useEventListener } from '@umijs/hooks'

import { Light as SyntaxHighlighter } from 'react-syntax-highlighter'
import sql from 'react-syntax-highlighter/dist/esm/languages/hljs/sql'
import lightTheme from 'react-syntax-highlighter/dist/esm/styles/hljs/atom-one-light'
import darkTheme from 'react-syntax-highlighter/dist/esm/styles/hljs/atom-one-dark-reasonable'
import Pre from '../Pre'
import formatSql from '@lib/utils/formatSql'
import moize from 'moize'
import { darkmodeEnabled } from '@lib/utils/themeSwitch'

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

function HighlightSQL({ sql, compact, theme }: Props) {
  const formattedSql = useMemo(() => {
    let f = formatSql(sql)
    if (compact) {
      f = simpleSqlMinify(f)
    }
    return f
  }, [sql, compact])
  return (
    <SyntaxHighlighter
      language="sql"
      style={theme === 'dark' ? darkTheme : lightTheme}
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

export default function HighlightSQLWrapper({ sql, compact }: Props) {
  const [darkMode, setDarkMode] = useState(darkmodeEnabled())
  useEventListener('enableDarkMode', (e) => {
    setDarkMode(e.detail)
  })
  const HighlightSQLInner = moize.react(
    () => (
      <HighlightSQL {...{ sql, compact, theme: darkMode ? 'dark' : 'light' }} />
    ),
    {
      maxSize: 1000,
    }
  )
  return <HighlightSQLInner />
}
