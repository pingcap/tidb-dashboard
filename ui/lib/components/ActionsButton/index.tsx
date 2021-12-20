import React from 'react'
import { Button, Dropdown, Menu } from 'antd'

export type Action = {
  key: string
  text: string
}

export type ActionsButtonProps = {
  actions: Action[]
  disabled: boolean
  onClick: (action: string) => void
}

export default function ActionsButton({
  actions,
  disabled,
  onClick,
}: ActionsButtonProps) {
  if (actions.length === 0) {
    throw new Error('actions should at least have one action')
  }

  // actions.length > 0
  const mainAction = actions[0]
  if (actions.length === 1) {
    return (
      <Button
        disabled={disabled}
        onClick={() => onClick(mainAction.key)}
        style={{ width: 150 }}
      >
        {mainAction.text}
      </Button>
    )
  }

  // actions.length > 1
  const menu = (
    <Menu onClick={(e) => onClick(e.key as string)}>
      {actions.map((act, idx) => {
        // skip the first option in menu since it has been show on the button.
        if (idx !== 0) {
          return <Menu.Item key={act.key}>{act.text}</Menu.Item>
        }
      })}
    </Menu>
  )
  return (
    <Dropdown.Button
      disabled={disabled}
      overlay={menu}
      onClick={() => onClick(mainAction.key)}
    >
      {mainAction.text}
    </Dropdown.Button>
  )
}
