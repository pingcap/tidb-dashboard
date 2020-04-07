import React from 'react'
import { Form, Select } from 'antd'
import { Card } from '@pingcap-incubator/dashboard_components'
import _ from 'lodash'
import { ALL_LANGUAGES } from '@/utils/i18n'
import { withTranslation } from 'react-i18next'

@withTranslation()
class LanguageForm extends React.PureComponent {
  handleLanguageChange = (langKey) => {
    this.props.i18n.changeLanguage(langKey)
  }

  render() {
    const { t } = this.props
    return (
      <Card title={t('dashboard_settings.i18n.title')}>
        <Form
          layout="vertical"
          initialValues={{ language: this.props.i18n.language }}
        >
          <Form.Item
            name="language"
            label={t('dashboard_settings.i18n.language')}
          >
            <Select onChange={this.handleLanguageChange} style={{ width: 200 }}>
              {_.map(ALL_LANGUAGES, (name, key) => {
                return (
                  <Select.Option key={key} value={key}>
                    {name}
                  </Select.Option>
                )
              })}
            </Select>
          </Form.Item>
        </Form>
      </Card>
    )
  }
}

const App = () => (
  <div>
    <LanguageForm />
  </div>
)

export default App
