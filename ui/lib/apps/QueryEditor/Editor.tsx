import React from 'react'
import AceEditor, { IAceEditorProps } from 'react-ace'
import { useSize } from 'ahooks'

import 'ace-builds/src-noconflict/mode-sql'
import 'ace-builds/src-noconflict/ext-searchbox'
import './editorThemes/oneHalfDark'
import './editorThemes/oneHalfLight'

import styles from './Editor.module.less'

interface IEditorProps extends IAceEditorProps {}

function Editor({ ...props }: IEditorProps, ref: React.Ref<AceEditor>) {
  const [state, containerRef] = useSize<HTMLDivElement>()
  return (
    <div className={styles.editorContainer} ref={containerRef}>
      <AceEditor
        mode="sql"
        theme="oneHalfLight"
        name="query_editor"
        fontSize={14}
        showPrintMargin={false}
        showGutter={true}
        highlightActiveLine={true}
        width={`${state.width}px`}
        height={`${state.height}px`}
        ref={ref}
        {...props}
      />
    </div>
  )
}

export default React.memo(React.forwardRef(Editor))
