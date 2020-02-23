import * as singleSpa from 'single-spa';
import React from 'react';
import { Form, Icon, Input, Button, Tabs, Alert, message } from 'antd';
import Flexbox from '@g07cha/flexbox-react';
import { withTranslation } from 'react-i18next';
import LanguageDropdown from '@/components/LanguageDropdown';
import client from '@/utils/client';
import * as authUtil from '@/utils/auth';

import styles from './RootComponent.module.less';

@Form.create({ name: 'tidb_signin' })
@withTranslation()
class TiDBSignInForm extends React.PureComponent {
  state = {
    loading: false,
  };

  signIn = async form => {
    this.setState({ loading: true });
    try {
      const r = await client.dashboard.userLoginPost({
        username: form.username,
        password: form.password,
        is_tidb_auth: true,
      });
      authUtil.setAuthToken(r.data.token);
      message.success(this.props.t('signin.message.success'));
      singleSpa.navigateToUrl('#' + this.props.registry.getDefaultRouter());
    } catch (e) {
      console.log(e);
      if (!e.handled) {
        let msg;
        if (e.response.data) {
          msg = this.props.t(e.response.data.code);
        } else {
          msg = e.message;
        }
        message.error(this.props.t('signin.message.error', { msg }));
      }
    }
    this.setState({ loading: false });
  };

  handleSubmit = e => {
    e.preventDefault();
    this.props.form.validateFields((err, values) => {
      if (err) {
        return;
      }
      this.signIn(values);
    });
  };

  render() {
    const { getFieldDecorator } = this.props.form;
    const { t } = this.props;
    return (
      <Form onSubmit={this.handleSubmit} layout="vertical">
        <Form.Item>
          <Alert
            message={t('signin.form.tidb_auth.message')}
            showIcon
            type="info"
          />
        </Form.Item>
        <Form.Item label={t('signin.form.username')}>
          {getFieldDecorator('username', {
            rules: [
              {
                required: true,
                message: t('signin.form.tidb_auth.check.username'),
              },
            ],
            initialValue: 'root',
          })(<Input prefix={<Icon type="user" />} disabled />)}
        </Form.Item>
        <Form.Item label={t('signin.form.password')}>
          {getFieldDecorator('password')(
            <Input
              prefix={<Icon type="lock" />}
              type="password"
              disabled={this.state.loading}
            />
          )}
        </Form.Item>
        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            block
            size="large"
            loading={this.state.loading}
          >
            {t('signin.form.button')}
          </Button>
        </Form.Item>
      </Form>
    );
  }
}

@withTranslation()
class App extends React.PureComponent {
  render() {
    const { t, registry } = this.props;
    return (
      <div className={styles.container}>
        <div className={styles.dialog}>
          <Flexbox justifyContent="space-between" alignItems="center">
            <h1 style={{ margin: 0 }}>TiDB Dashboard</h1>
            <LanguageDropdown>
              <a href="javascript:;">
                <Icon type="global" />
              </a>
            </LanguageDropdown>
          </Flexbox>
          <Tabs defaultActiveKey="tidb_signin" style={{ marginTop: '10px' }}>
            <Tabs.TabPane
              tab={t('signin.form.tidb_auth.title')}
              key="tidb_signin"
            >
              <TiDBSignInForm registry={registry} />
            </Tabs.TabPane>
          </Tabs>
        </div>
      </div>
    );
  }
}

export default App;
