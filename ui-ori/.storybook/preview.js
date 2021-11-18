import React, { useEffect } from 'react'
import { addDecorator } from '@storybook/react'
import { Root } from '@lib/components'
import client from '@lib/client'
import * as auth from '@lib/utils/auth'

function StoryRoot({ children }) {
  useEffect(() => {
    client
      .getInstance()
      .userLogin({
        username: 'root',
        password: '',
        type: 0,
      })
      .then((r) => auth.setAuthToken(r.data.token))
  }, [])

  return <Root>{children}</Root>
}

addDecorator((storyFn) => <StoryRoot>{storyFn()}</StoryRoot>)
