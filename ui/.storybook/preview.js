import React from 'react'
import { addDecorator } from '@storybook/react'
import { Root } from '@lib/components'

addDecorator((storyFn) => <Root>{storyFn()}</Root>)
