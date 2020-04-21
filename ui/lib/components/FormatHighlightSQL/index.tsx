import React from 'react'
import sqlFormatter from 'sql-formatter-plus'
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter'
import sql from 'react-syntax-highlighter/dist/esm/languages/hljs/sql'
import lightTheme from 'react-syntax-highlighter/dist/esm/styles/hljs/atom-one-light'
import darkTheme from 'react-syntax-highlighter/dist/esm/styles/hljs/atom-one-dark-reasonable'

import Pre from '../Pre'

SyntaxHighlighter.registerLanguage('sql', sql)

type Props = {
  sql: string
  theme?: 'dark' | 'light'
}

export default function FormatHighlightSQL({ sql, theme = 'light' }: Props) {
  return (
    <SyntaxHighlighter
      language="sql"
      style={theme === 'light' ? lightTheme : darkTheme}
      customStyle={{
        background: 'none',
        padding: 0,
      }}
      PreTag={Pre}
    >
      {sqlFormatter.format(sql, { uppercase: true })}
    </SyntaxHighlighter>
  )
}
