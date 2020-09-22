import React, { useState, useCallback, useRef } from 'react'
import cx from 'classnames'
import { Root, Card } from '@lib/components'
import Split from 'react-split'
import { Button, Space, Typography } from 'antd'
import {
  CaretRightOutlined,
  LoadingOutlined,
  WarningOutlined,
  CheckOutlined,
} from '@ant-design/icons'

import Editor from './Editor'
import ResultTable from './ResultTable'

import styles from './index.module.less'
import client, { QueryeditorRunResponse } from '@lib/client'
import ReactAce from 'react-ace/lib/ace'
import { getValueFormat } from '@baurine/grafana-value-formats'

const MAX_DISPLAY_ROWS = 1000

function App() {
  const [results, setResults] = useState<QueryeditorRunResponse | undefined>()
  const [isRunning, setRunning] = useState(false)
  const editor = useRef<ReactAce>(null)

  const isResultsEmpty =
    !results ||
    (!results.error_msg && (!results.column_names?.length || !results.rows))

  const handleRun = useCallback(async () => {
    try {
      setRunning(true)
      setResults(undefined)
      const resp = await client.getInstance().queryEditorRun({
        max_rows: MAX_DISPLAY_ROWS,
        statements: editor.current?.editor.getValue(),
      })
      setResults(resp.data)
    } finally {
      setRunning(false)
    }
    editor.current?.editor.focus()
  }, [])

  return (
    <Root>
      <div className={styles.container}>
        <Card>
          <Space>
            <Button
              type="primary"
              icon={<CaretRightOutlined />}
              onClick={handleRun}
              disabled={isRunning}
            >
              Run
            </Button>
            {
              <span>
                {isRunning && <LoadingOutlined spin />}
                {results && results.error_msg && (
                  <Typography.Text type="danger">
                    <WarningOutlined /> Error (
                    {getValueFormat('ms')(results.execution_ms || 0, 1)})
                  </Typography.Text>
                )}
                {results && !results.error_msg && (
                  <Typography.Text className={styles.successText}>
                    <CheckOutlined /> Success (
                    {getValueFormat('ms')(results.execution_ms || 0, 1)},
                    {(results.actual_rows || 0) > (results.rows?.length || 0)
                      ? `Displaying first ${results.rows?.length || 0} of ${
                          results.actual_rows || 0
                        } rows`
                      : `${results.rows?.length || 0} rows`}
                    )
                  </Typography.Text>
                )}
              </span>
            }
          </Space>
        </Card>
        <Split
          direction="vertical"
          dragInterval={30}
          className={cx(styles.contentContainer, {
            [styles.isCollapsed]: isResultsEmpty,
          })}
          sizes={isResultsEmpty ? [100, 0] : [50, 50]}
          minSize={isResultsEmpty ? 0 : 100}
          expandToMin={false}
        >
          <Card noMarginTop noMarginBottom={!isResultsEmpty} flexGrow>
            <Editor focus ref={editor} />
          </Card>
          <div className={styles.resultTableContainer}>
            {!isResultsEmpty && <ResultTable results={results} />}
          </div>
        </Split>
      </div>
    </Root>
  )
}

export default App
