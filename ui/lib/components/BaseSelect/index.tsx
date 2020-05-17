import React, { useState, useCallback, useRef } from 'react'
import cx from 'classnames'
import { Dropdown } from 'antd'
import { useEventListener } from '@umijs/hooks'
import { DownOutlined } from '@ant-design/icons'
import KeyCode from 'rc-util/lib/KeyCode'
import { TextWrap } from '..'

import styles from './index.module.less'

export interface IBaseSelectDropdownRenderProps<T> {
  value?: T
  triggerOnChange?: (value: T) => void
}

export interface IBaseSelectProps<T>
  extends Omit<
    React.HTMLAttributes<HTMLDivElement>,
    'onChange' | 'placeholder'
  > {
  dropdownRender: (
    renderProps: IBaseSelectDropdownRenderProps<T>
  ) => React.ReactElement
  value?: T
  valueRender: (value?: T) => React.ReactNode
  onChange?: (value: T) => void
  placeholder?: React.ReactNode
  disabled?: boolean
  tabIndex?: number
  autoFocus?: boolean
}

function BaseSelect<T>({
  dropdownRender,
  value,
  valueRender,
  onChange,
  placeholder,
  disabled,
  tabIndex,
  autoFocus,
  className,
  onFocus,
  onBlur,
  onKeyDown,
  onMouseDown,
  ...restProps
}: IBaseSelectProps<T>) {
  const [dropdownVisible, setDropdownVisible] = useState(false)
  const toggleDropdownVisible = useCallback(() => {
    if (disabled) {
      return
    }
    setDropdownVisible((v) => !v)
  }, [disabled])

  const [isFocused, setFocused] = useState(false)

  const handleContainerFocus = useCallback(
    (ev: React.FocusEvent<HTMLDivElement>) => {
      setFocused(true)
      onFocus && onFocus(ev)
    },
    [onFocus]
  )

  const handleContainerBlur = useCallback(
    (ev: React.FocusEvent<HTMLDivElement>) => {
      setDropdownVisible(false)
      setFocused(false)
      onBlur && onBlur(ev)
    },
    [onBlur]
  )

  const handleContainerKeyDown = useCallback(
    (ev: React.KeyboardEvent<HTMLDivElement>) => {
      if (ev.which === KeyCode.ENTER) {
        toggleDropdownVisible()
      } else if (ev.which === KeyCode.ESC) {
        setDropdownVisible(false)
      }
      onKeyDown && onKeyDown(ev)
    },
    [toggleDropdownVisible, onKeyDown]
  )

  const handleContainerMouseDown = useCallback(
    (ev: React.MouseEvent<HTMLDivElement>) => {
      toggleDropdownVisible()
      onMouseDown && onMouseDown(ev)
    },
    [toggleDropdownVisible, onMouseDown]
  )

  const handleOverlayMouseDown = useCallback(
    (ev: React.MouseEvent<HTMLDivElement>) => {
      // Prevent dropdown container blur event
      ev.preventDefault()
    },
    []
  )

  const dropdownOverlayRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const overlay = (
    <div
      ref={dropdownOverlayRef}
      onMouseDown={handleOverlayMouseDown}
      className={styles.baseSelectOverlay}
    >
      {dropdownRender({
        value,
        triggerOnChange: onChange,
      })}
    </div>
  )

  useEventListener('mousedown', (ev: MouseEvent) => {
    // Close the dropdown if click outside
    if (!dropdownVisible) {
      return
    }
    const hitElements = [dropdownOverlayRef.current, containerRef.current]
    if (
      hitElements.every(
        (e) =>
          !e ||
          !ev.target ||
          (!e.contains(ev.target as HTMLElement) && e !== ev.target)
      )
    ) {
      setDropdownVisible(false)
    }
  })

  // Close dropdown when disabled change
  React.useEffect(() => {
    setDropdownVisible((v) => {
      if (v && !disabled) {
        return false
      }
      // Otherwise, unchanged
      return v
    })
  }, [disabled])

  const renderedValue = valueRender(value)
  const displayAsPlaceholder = renderedValue == null

  return (
    <Dropdown overlay={overlay} trigger={[]} visible={dropdownVisible}>
      <div
        className={cx(styles.baseSelect, className)}
        onFocus={handleContainerFocus}
        onBlur={handleContainerBlur}
        onKeyDown={handleContainerKeyDown}
        onMouseDown={handleContainerMouseDown}
        ref={containerRef}
        {...restProps}
      >
        <div
          className={cx(styles.baseSelectInner, {
            [styles.focused]: isFocused,
            [styles.disabled]: disabled,
          })}
        >
          <input
            autoComplete="off"
            className={styles.baseSelectInput}
            disabled={disabled}
            tabIndex={tabIndex}
            autoFocus={autoFocus}
            readOnly
          />
          <div
            className={cx(styles.baseSelectValueDisplay, {
              [styles.isPlaceholder]: displayAsPlaceholder,
            })}
          >
            <TextWrap>
              {displayAsPlaceholder ? placeholder : renderedValue}
            </TextWrap>
          </div>
        </div>
        <div className={styles.baseSelectArrow}>
          <DownOutlined />
        </div>
      </div>
    </Dropdown>
  )
}

BaseSelect.whyDidYouRender = true

export default React.memo(BaseSelect)
