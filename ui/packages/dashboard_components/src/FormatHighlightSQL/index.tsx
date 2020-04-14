import React from 'react'
import sqlFormatter from 'sql-formatter-plus'
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter'
import sql from 'react-syntax-highlighter/dist/esm/languages/hljs/sql'
import atomOneLight from 'react-syntax-highlighter/dist/esm/styles/hljs/atom-one-light'
import atomOneDark from 'react-syntax-highlighter/dist/esm/styles/hljs/atom-one-dark'
import './index.module.less'

SyntaxHighlighter.registerLanguage('sql', sql)

type Props = {
  sql: string
  theme?: 'dark' | 'light'
}

export default function FormatHighlightSQL({ sql, theme = 'light' }: Props) {
  return (
    <SyntaxHighlighter
      language="sql"
      style={theme === 'light' ? atomOneLight : atomOneDark}
    >
      {sqlFormatter.format(sql, { uppercase: true })}
    </SyntaxHighlighter>
  )
}
