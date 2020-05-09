import React from 'react'
import { LogoutOutlined } from '@ant-design/icons'
import { Button } from 'antd'
import { AnimatedSkeleton, Root, Head, Card } from '@lib/components'
import client from '@lib/client'
import { withTranslation } from 'react-i18next'
import * as auth from '@lib/utils/auth'

@withTranslation()
class App extends React.PureComponent {
  state = {
    login: null,
  }

  async componentDidMount() {
    const resp = await client.getInstance().infoWhoamiGet()
    if (resp.data) {
      this.setState({ login: resp.data })
    }
  }

  handleLogout = () => {
    auth.clearAuthToken()
    window.location.reload()
  }

  render() {
    const { t } = this.props

    return (
      <Root>
        <Head title={t('user_profile.title', this.state.login || '...')} />
        <Card>
          <AnimatedSkeleton showSkeleton={!this.state.login}>
            <Button type="danger" onClick={this.handleLogout}>
              <LogoutOutlined /> {t('user_profile.logout')}
            </Button>
          </AnimatedSkeleton>
        </Card>
      </Root>
    )
  }
}

export default App
