import React, { useMemo } from 'react'

// This usage will generate tons of files about languages highlight when esbuild splitting enable
// See https://github.com/react-syntax-highlighter/react-syntax-highlighter/blob/master/src/async-languages/hljs.js to understand why
// import { Light as SyntaxHighlighter } from 'react-syntax-highlighter'
import SyntaxHighlighter from 'react-syntax-highlighter/dist/esm/light'
import sql from 'react-syntax-highlighter/dist/esm/languages/hljs/sql'
import lightTheme from 'react-syntax-highlighter/dist/esm/styles/hljs/atom-one-light'
import darkTheme from 'react-syntax-highlighter/dist/esm/styles/hljs/atom-one-dark'
import Pre from '../Pre'
import formatSql from '@lib/utils/sqlFormatter'
import moize from 'moize'

SyntaxHighlighter.registerLanguage('sql', sql)

interface Props {
  sql: string
  compact?: boolean
  theme?: 'dark' | 'light'
  format?: boolean
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

function HighlightSQL({ sql, compact, theme = 'light', format = true }: Props) {
  const formattedSql = useMemo(() => {
    let f = format ? formatSql(sql) : sql
    if (compact) {
      f = simpleSqlMinify(f)
    }
    return f
  }, [sql, compact, format])

  return (
    <SyntaxHighlighter
      language="sql"
      style={theme === 'light' ? lightTheme : darkTheme}
      customStyle={{
        background: 'none',
        padding: 0,
        overflowX: 'hidden'
      }}
      PreTag={Pre}
      data-e2e={`syntax_highlighter_${compact ? 'compact' : 'original'}`}
    >
      {formattedSql}
    </SyntaxHighlighter>
  )
}

export default moize(HighlightSQL, {
  isShallowEqual: true,
  maxArgs: 2,
  maxSize: 1000
})
