import React from 'react'
import { LogoutOutlined } from '@ant-design/icons'
import { Skeleton, Button } from 'antd'
import { Head, Card } from '@lib/components'
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
    if (!this.state.login) {
      return (
        <Card>
          <Skeleton active />
        </Card>
      )
    }

    const { t } = this.props

    return (
      <div>
        <Head title={t('user_profile.title', this.state.login)} />
        <Card>
          <Button type="danger" onClick={this.handleLogout}>
            <LogoutOutlined /> {t('user_profile.logout')}
          </Button>
        </Card>
      </div>
    )
  }
}

export default App
