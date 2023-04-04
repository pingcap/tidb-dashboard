import React, { useCallback, useContext, useEffect, useState } from 'react'
import { SQLAdvisorContext } from '../context'
import {
  Typography,
  Form,
  Input,
  Button,
  Card,
  Row,
  Col,
  notification,
  Skeleton,
  Alert
} from 'antd'
import styles from './IndexInsightListWithRegister.module.less'
import { HighlightSQL, CopyLink } from '@lib/components'
import { LockOutlined, UserOutlined } from '@ant-design/icons'
import IndexInsightList from './IndexInsightList'
import { DbassSecuritySettingImg } from '../utils/dbaasSecuritySetting'

const { Title } = Typography

const sql = [
  `CREATE user 'yourusername'@'%' IDENTIFIED by 'yourpassword';`,
  `GRANT SELECT ON information_schema.* TO 'yourusername'@'%';`,
  `GRANT SELECT ON mysql.* TO 'yourusername'@'%';`,
  `GRANT PROCESS, REFERENCES ON *.* TO 'yourusername'@'%';`,
  `FLUSH PRIVILEGES;`
]

const RegisterForm = ({ setIsUserDBRegistered }: UnRegisteredUserDBProps) => {
  const ctx = useContext(SQLAdvisorContext)
  const [isPosting, setIsPosting] = useState<boolean>(false)
  const handleOnFinish = useCallback(
    async (values: any) => {
      setIsPosting(true)

      const params = {
        userName: values.username,
        addr: values.addr,
        port: values.port,
        password: values.password
      }

      try {
        const res = await ctx?.ds.activateDBConnection(params)
        notification.success({
          message: res
        })
        setIsUserDBRegistered(true)
      } catch (e: any) {
        notification.error({
          message: e.message
        })
      } finally {
        setIsPosting(false)
      }
    },
    [ctx, setIsUserDBRegistered]
  )

  return (
    <Form
      name="normal_login"
      className="login-form"
      initialValues={{ remember: true }}
      onFinish={handleOnFinish}
    >
      <Form.Item
        name="username"
        rules={[{ required: true, message: 'Please input your Username!' }]}
      >
        <Input
          prefix={<UserOutlined className={styles.siteFormItemIcon} />}
          placeholder="Username"
        />
      </Form.Item>
      <Form.Item name="password">
        <Input
          prefix={<LockOutlined className={styles.siteFormItemIcon} />}
          type="password"
          placeholder="Password"
        />
      </Form.Item>

      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          className={styles.loginFormButton}
          loading={isPosting}
        >
          Active
        </Button>
      </Form.Item>
    </Form>
  )
}

interface UnRegisteredUserDBProps {
  setIsUserDBRegistered: (isUserDBRegistered: boolean) => void
}

const UnRegisteredUserDB: React.FC<UnRegisteredUserDBProps> = ({
  setIsUserDBRegistered
}) => {
  return (
    <div className={styles.container}>
      <Row gutter={32}>
        <Col className="gutter-row" span={16}>
          <Card className={styles.instructionCard}>
            <Title level={5}>Performance Insight (BETA):</Title>
            <p>
              Improve your database performance with ease by using our advanced
              algorithms to analyze your collection metadata and slow query
              logs. Trust our feature to identify areas where indexes or changes
              to the schema can improve query performance and make the necessary
              adjustments for optimal performance. Activate now for faster and
              more efficient database performance.
            </p>
          </Card>
          <Card className={styles.instructionCard}>
            <Title level={5}>Permissions required:</Title>
            <Alert
              message={`Please replace your user name and password in the 'yourusername' and 'yourpassword' field.`}
              type="warning"
              showIcon
            />
            <p style={{ paddingTop: 10 }}>
              This feature requires read access to database `information_schema`
              and `mysql`. You can create a new sql user on your SQL client to
              activate this feature.
            </p>
            <div className={styles.commandBlock}>
              <div>
                {sql.map((s) => (
                  <HighlightSQL key={s} sql={s} compact format={false} />
                ))}
              </div>
              <CopyLink data={sql.join('\n')} />
            </div>
          </Card>
          <Card className={styles.instructionCard}>
            <Title level={5}>Network required:</Title>
            <p>
              During the Beta phase, this feature requires users to{' '}
              <strong>manually</strong> open the IP access list before it can be
              enabled. In subsequent versions, a more user-friendly method of
              enabling this feature will be supported.
            </p>
            <p>You should</p>
            <p>
              1. Open "<strong>Allow Access From Anywhere</strong>" on IP Access
              List.
            </p>
            <p>
              2. Click "<strong>Apply</strong>" Buttom to complete the change.
            </p>
            <img src={DbassSecuritySettingImg} style={{ width: '100%' }} />
          </Card>
        </Col>
        <Col className="gutter-row" span={8} style={{ marginTop: '10rem' }}>
          <div style={{ position: 'fixed', width: '350px' }}>
            <RegisterForm setIsUserDBRegistered={setIsUserDBRegistered} />
          </div>
        </Col>
      </Row>
    </div>
  )
}

const IndexInsightListWithRegister = () => {
  const ctx = useContext(SQLAdvisorContext)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isUserDBRegistered, setIsUserDBRegistered] = useState<boolean>(false)
  const [isDeactivating, setIsDeactivating] = useState<boolean>(false)

  useEffect(() => {
    const registerUserDBStatusGet = async () => {
      try {
        setIsLoading(true)
        const status = await ctx?.ds.checkDBConnection()
        setIsUserDBRegistered(status)
      } catch (e) {
        setIsUserDBRegistered(false)
      } finally {
        setIsLoading(false)
      }
    }

    registerUserDBStatusGet()
  }, [ctx])

  const handleDeactivate = async () => {
    try {
      setIsDeactivating(true)
      const res = await ctx?.ds.deactivateDBConnection()
      setIsUserDBRegistered(false)
      notification.success({
        message: res
      })
    } catch (e: any) {
      notification.error({
        message: e.message
      })
    } finally {
      setIsDeactivating(false)
    }
  }

  return (
    <>
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 4 }} style={{ padding: '48px' }} />
      ) : (
        <>
          {isUserDBRegistered ? (
            <IndexInsightList
              onHandleDeactivate={handleDeactivate}
              isDeactivating={isDeactivating}
            />
          ) : (
            <UnRegisteredUserDB setIsUserDBRegistered={setIsUserDBRegistered} />
          )}
        </>
      )}
    </>
  )
}

export default IndexInsightListWithRegister
