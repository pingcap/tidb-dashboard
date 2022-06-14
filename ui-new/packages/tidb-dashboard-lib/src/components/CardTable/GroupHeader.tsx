// FIXME: This is mostly a clone from https://github.com/microsoft/fluentui/blob/master/packages/office-ui-fabric-react/src/components/GroupedList/GroupHeader.base.tsx, but replaced with Ant'd Checkbox
// Drop it after https://github.com/microsoft/fluentui/issues/13144 is resolved

import React from 'react'
import {
  classNamesFunction,
  styled
} from 'office-ui-fabric-react/lib/Utilities'
import {
  IGroupHeaderStyleProps,
  IGroupHeaderStyles,
  IGroupHeaderProps,
  GroupSpacer
} from 'office-ui-fabric-react/lib/GroupedList'
import {
  FocusZone,
  FocusZoneDirection
} from 'office-ui-fabric-react/lib/FocusZone'
import { getStyles } from 'office-ui-fabric-react/lib/components/GroupedList/GroupHeader.styles'

import { Icon } from 'office-ui-fabric-react/lib/Icon'
import { Checkbox } from 'antd'
import { useMemoizedFn } from 'ahooks'

const getClassNames = classNamesFunction<
  IGroupHeaderStyleProps,
  IGroupHeaderStyles
>()

function BaseAntCheckboxGroupHeader(props: IGroupHeaderProps) {
  const _classNames = getClassNames(props.styles, {
    theme: props.theme!,
    className: props.className,
    selected: props.selected,
    isCollapsed: props.group?.isCollapsed,
    compact: props.compact
  })

  const _onHeaderClick = useMemoizedFn(() => {
    if (props.onToggleSelectGroup) {
      props.onToggleSelectGroup(props.group!)
    }
  })

  const _onToggleSelectGroupClick = useMemoizedFn(
    (ev: React.MouseEvent<HTMLElement>) => {
      if (props.onToggleSelectGroup) {
        props.onToggleSelectGroup(props.group!)
      }
      ev.preventDefault()
      ev.stopPropagation()
    }
  )

  const _onToggleCollapse = useMemoizedFn(
    (ev: React.MouseEvent<HTMLElement>) => {
      if (props.onToggleCollapse) {
        props.onToggleCollapse(props.group!)
      }
      ev.stopPropagation()
      ev.preventDefault()
    }
  )

  return (
    <div
      className={_classNames.root}
      style={props.viewport ? { minWidth: props.viewport.width } : {}}
      onClick={_onHeaderClick}
    >
      <FocusZone
        className={_classNames.groupHeaderContainer}
        direction={FocusZoneDirection.horizontal}
      >
        <button
          type="button"
          className={_classNames.check}
          onClick={_onToggleSelectGroupClick}
          {...props.selectAllButtonProps}
        >
          <Checkbox checked={props.selected} />
        </button>

        <GroupSpacer
          indentWidth={props.indentWidth}
          count={props.groupLevel!}
        />
        <button
          type="button"
          className={_classNames.expand}
          onClick={_onToggleCollapse}
          {...props.expandButtonProps}
        >
          <Icon
            className={_classNames.expandIsCollapsed}
            iconName={'ChevronRightMed'}
          />
        </button>
        <div className={_classNames.title}>
          <span>{props.group?.name}</span>
        </div>
      </FocusZone>
    </div>
  )
}

export const AntCheckboxGroupHeader: React.FunctionComponent<IGroupHeaderProps> =
  styled<IGroupHeaderProps, IGroupHeaderStyleProps, IGroupHeaderStyles>(
    BaseAntCheckboxGroupHeader,
    getStyles,
    undefined,
    {
      scope: 'GroupHeader'
    }
  )
