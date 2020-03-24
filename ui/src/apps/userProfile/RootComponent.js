import React from 'react'
import { Skeleton, Button, Icon } from 'antd'
import { Head, Card } from '@pingcap-incubator/dashboard_components'
import client from '@pingcap-incubator/dashboard_client'
import { withTranslation } from 'react-i18next'
import * as authUtil from '@/utils/auth'

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
    authUtil.clearAuthToken()
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
            <Icon type="logout" /> {t('user_profile.logout')}
          </Button>
        </Card>
      </div>
    )
  }
}

export default App
