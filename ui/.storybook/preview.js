import React, { useEffect } from 'react'
import { addDecorator } from '@storybook/react'
import { Root } from '@lib/components'
import client from '@lib/client'
import * as apiClient from '@lib/utils/apiClient'
import * as auth from '@lib/utils/auth'

function StoryRoot({ children }) {
  useEffect(() => {
    apiClient.init()
    client
      .getInstance()
      .userLoginPost({
        username: 'root',
        password: '',
        is_tidb_auth: true,
      })
      .then((r) => auth.setAuthToken(r.data.token))
  }, [])

  return <Root>{children}</Root>
}

addDecorator((storyFn) => <StoryRoot>{storyFn()}</StoryRoot>)
