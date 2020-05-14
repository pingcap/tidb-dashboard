import { Button } from 'antd'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LogoutOutlined } from '@ant-design/icons'

import client, { InfoWhoAmIResponse } from '@lib/client'
import { AnimatedSkeleton, Card, Head, Root } from '@lib/components'
import * as auth from '@lib/utils/auth'

function App() {
  const { t } = useTranslation()

  const [login, setLogin] = useState<InfoWhoAmIResponse | null>(null)

  useEffect(() => {
    async function getInfo() {
      const resp = await client.getInstance().infoWhoamiGet()
      if (resp.data) {
        setLogin(resp.data)
      }
    }
    getInfo()
  }, [])

  function handleLogout() {
    auth.clearAuthToken()
    window.location.reload()
  }

  return (
    <Root>
      <Head title={t('user_profile.title', login || '...')} />
      <Card>
        <AnimatedSkeleton showSkeleton={!login}>
          <Button type="danger" onClick={handleLogout}>
            <LogoutOutlined /> {t('user_profile.logout')}
          </Button>
        </AnimatedSkeleton>
      </Card>
    </Root>
  )
}

export default App
