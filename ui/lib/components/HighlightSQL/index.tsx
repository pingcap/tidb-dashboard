import React from 'react'

import { Light as SyntaxHighlighter } from 'react-syntax-highlighter'
import sql from 'react-syntax-highlighter/dist/esm/languages/hljs/sql'
import lightTheme from 'react-syntax-highlighter/dist/esm/styles/hljs/atom-one-light'
import darkTheme from 'react-syntax-highlighter/dist/esm/styles/hljs/atom-one-dark-reasonable'

import Pre from '../Pre'
import formatSql from '@lib/utils/formatSql'

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

export default function HighlightSQL({ sql, compact, theme = 'light' }: Props) {
  sql = formatSql(sql)
  if (compact) {
    sql = simpleSqlMinify(sql)
  }
  return (
    <SyntaxHighlighter
      language="sql"
      style={theme === 'light' ? lightTheme : darkTheme}
      customStyle={{
        background: 'none',
        padding: 0,
        overflowX: 'hidden',
      }}
      PreTag={Pre}
    >
      {sql}
    </SyntaxHighlighter>
  )
}
