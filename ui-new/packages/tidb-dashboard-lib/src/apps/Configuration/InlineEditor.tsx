import React, { useState, useCallback, useEffect } from 'react'
import { EditOutlined } from '@ant-design/icons'
import { Input, Popover, Button, Space, Tooltip } from 'antd'
import { useMemoizedFn } from 'ahooks'

interface IInlineEditorProps {
  title?: string
  value: any
  displayValue: string
  onSave?: (newValue: any) => Promise<boolean | void>
}

function valueWithSameType(newValue, oldValue) {
  if (typeof oldValue === 'string') {
    return newValue
  } else if (typeof oldValue === 'number') {
    // Note: `Number()` is more strict than `parseFloat()`.
    const v = Number(newValue)
    if (isNaN(v)) {
      throw new Error(`"${newValue}" is not a number`)
    }
    return v
  } else if (typeof oldValue === 'boolean') {
    switch (String(newValue).toLowerCase().trim()) {
      case 'true':
      case 'yes':
      case '1':
        return true
      case 'false':
      case 'no':
      case '0':
        return false
      default:
        throw new Error(`"${newValue}" is not a boolean`)
    }
  } else {
    // Otherwise, return as string
    return newValue
  }
}

function InlineEditor({
  value,
  displayValue,
  title,
  onSave
}: IInlineEditorProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [inputVal, setInputVal] = useState(displayValue)
  const [isPosting, setIsPosting] = useState(false)

  const handleCancel = useCallback(() => {
    setIsVisible(false)
    setInputVal(displayValue)
  }, [displayValue])

  const handleSave = useMemoizedFn(async () => {
    if (!onSave) {
      setIsVisible(false)
      return
    }
    try {
      setIsPosting(true)
      // PD only accept modified config in the same value type,
      // i.e. true => false, but not true => "false"
      const r = await onSave(valueWithSameType(inputVal, value))
      if (r !== false) {
        // When onSave returns non-false, input value is not reverted and only popup is hidden
        setIsVisible(false)
      } else {
        // When onSave returns false, popup is not hidden and value is reverted
        setInputVal(displayValue)
      }
    } catch (e) {
      setInputVal(displayValue)
      setIsVisible(false)
    } finally {
      setIsPosting(false)
    }
  })

  const handleInputValueChange = useCallback((e) => {
    setInputVal(e.target.value)
  }, [])

  useEffect(() => {
    setInputVal(displayValue)
  }, [displayValue])

  const renderPopover = useMemoizedFn(() => {
    return (
      <Space direction="vertical" style={{ width: '100%' }}>
        <div>
          <Input
            value={inputVal}
            size="small"
            onChange={handleInputValueChange}
            disabled={isPosting}
          />
        </div>
        <div>
          <Space>
            <Button
              type="primary"
              size="small"
              onClick={handleSave}
              disabled={isPosting}
            >
              Save
            </Button>
            <Button size="small" onClick={handleCancel} disabled={isPosting}>
              Cancel
            </Button>
          </Space>
        </div>
      </Space>
    )
  })

  return (
    <Popover
      trigger="click"
      placement="rightTop"
      content={renderPopover}
      title={`Edit ${title ?? ''}`}
      visible={isVisible}
      onVisibleChange={setIsVisible}
    >
      <a>
        <EditOutlined />{' '}
        <Tooltip title={displayValue}>
          <code>{displayValue}</code>
        </Tooltip>
      </a>
    </Popover>
  )
}

export default InlineEditor
