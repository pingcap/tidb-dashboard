import React, { useState, useEffect } from 'react'
import * as Database from '@lib/utils/xcClient/database'
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Typography,
  Tooltip,
  Checkbox,
  Divider,
} from 'antd'
import {
  ArrowLeftOutlined,
  BackwardOutlined,
  ForwardOutlined,
  TableOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { Card, Pre, Head } from '@lib/components'
import { useTranslation } from 'react-i18next'
import useQueryParams from '@lib/utils/useQueryParams'

export default function TableDataView() {
  const { db, table } = useQueryParams()
  const [pageNum, setPageNumb] = useState(1)
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [form] = Form.useForm()
  const [tableInfo, setTableInfo] = useState<any>()
  const [formModalVisible, setFormModalVisible] = useState(false)
  const [confirmModalVisible, setConfirmModalVisible] = useState(false)
  const [modalInfo, setModalInfo] = useState<any>({
    type: '',
    title: '',
    message: '',
    rowInfo: [],
  })

  const showFormModal = (info) => () => {
    const modalType = info.type
    switch (modalType) {
      case 'insertRow':
      case 'editRow':
        form.resetFields()
        setFormModalVisible(true)
        break
      case 'deleteRow':
        setConfirmModalVisible(true)
        break
      default:
        break
    }

    setModalInfo(info)
  }

  const ConfirmModal = () => {
    return (
      <Modal
        title={modalInfo.title}
        visible={confirmModalVisible}
        onCancel={onCancel}
        onOk={() => handleDeleteTableRow(modalInfo.rowInfo)}
      ></Modal>
    )
  }

  const selectTableRow = async (page) => {
    try {
      setTableInfo(await Database.selectTableRow(db, table, page - 1))
    } catch (e) {
      console.log('selectTableRow error', e)
    }
  }

  useEffect(() => {
    selectTableRow(pageNum)
  }, [pageNum])

  const editCol = (row, index, type) => {
    const { name, isNotNull } = row

    return (
      <>
        {type === 'checkbox' ? (
          <Form.Item name={`checkbox-${name}-${index}`} valuePropName="checked">
            <Checkbox disabled={isNotNull ? true : false} />
          </Form.Item>
        ) : (
          <Form.Item
            shouldUpdate={(prevValues, currentValues) =>
              prevValues[`checkbox-${name}-${index}`] !==
              currentValues[`checkbox-${name}-${index}`]
            }
          >
            {({ getFieldValue }) => {
              return getFieldValue(`checkbox-${name}-${index}`) ? (
                <Form.Item
                  name={`input-${name}-${index}`}
                  rules={isNotNull && [{ required: true }]}
                  noStyle
                >
                  <Input disabled />
                </Form.Item>
              ) : (
                <>
                  {modalInfo.type === 'editRow' ? (
                    <Form.Item
                      name={`input-${name}-${index}`}
                      rules={[{ required: true }]}
                      initialValue={modalInfo.rowInfo[index]}
                      noStyle
                    >
                      <Input />
                    </Form.Item>
                  ) : (
                    <Form.Item
                      name={`input-${name}-${index}`}
                      rules={[{ required: true }]}
                      noStyle
                    >
                      <Input />
                    </Form.Item>
                  )}
                </>
              )
            }}
          </Form.Item>
        )}
      </>
    )
  }

  const insertRowFormcolumns = [
    {
      title: 'Column',
      key: 'column',
      dataIndex: 'column',
    },
    {
      title: 'Type',
      key: 'type',
      dataIndex: 'type',
    },
    {
      title: 'NULL',
      key: 'isNotNull',
      dataIndex: 'isNotNull',
      render: (_, row, index) => {
        return editCol(row, index, 'checkbox')
      },
    },
    {
      title: 'Value',
      dataIndex: 'value',
      key: 'value',
      render: (_, row, index) => {
        return editCol(row, index, 'input')
      },
    },
  ]

  const handleInsertOrEditRow = (values) => {
    const columnsToInsert = tableInfo.columns.map((c, idx) => {
      return {
        ...{ columnName: c.name },
        ...{ value: values[`input-${c.name}-${idx}`] },
      }
    })

    async function insertOrInsertTableRow() {
      try {
        if (modalInfo.type === 'editRow') {
          const originData = tableInfo.columns.map((c, idx) => {
            return {
              ...{ columnName: c.name },
              ...{ columnValue: modalInfo.rowInfo[idx] },
            }
          })

          await Database.updateTableRow(
            db,
            table,
            { whereColumns: originData },
            columnsToInsert
          )
          Modal.success({
            title: t('data_manager.update_success_txt'),
          })
        } else {
          await Database.insertTableRow(db, table, columnsToInsert)
          Modal.success({
            title: t('data_manager.create_success_txt'),
          })
        }

        selectTableRow(1)
      } catch (e) {
        Modal.error({
          title:
            modalInfo.type === 'editRow'
              ? t('data_manager.update_failed_txt')
              : t('data_manager.create_failed_txt'),
          content: <Pre>{e.message}</Pre>,
        })
      }
    }

    insertOrInsertTableRow()
    setFormModalVisible(false)
    form.resetFields()
  }

  const InsertRowFormOnModal = () => {
    return (
      <Form onFinish={handleInsertOrEditRow} form={form}>
        <Table
          bordered
          pagination={false}
          dataSource={tableInfo.columns.map((column, idx) => {
            return {
              ...{ key: idx },
              ...{ column: column.name },
              ...{ type: column.fieldType },
              ...column,
            }
          })}
          columns={insertRowFormcolumns}
        />

        <Form.Item style={{ marginTop: '2rem' }}>
          <Button type="primary" htmlType="submit">
            {t('data_manager.submit')}
          </Button>
        </Form.Item>
      </Form>
    )
  }

  const onCancel = () => {
    setFormModalVisible(false)
    setFormModalVisible(false)
  }

  const FormModal = () => {
    return (
      <Modal
        title={
          modalInfo.type === 'insertRow'
            ? t('data_manager.select_table.insert_row')
            : t('data_manager.select_table.edit_row')
        }
        visible={formModalVisible}
        onCancel={onCancel}
        footer={null}
      >
        <InsertRowFormOnModal />
      </Modal>
    )
  }

  const handleDeleteTableRow = (row) => {
    const tableColumns = tableInfo.columns

    const deleteRow = tableColumns.map((col, idx) => {
      return {
        ...{ columnName: col['name'] },
        ...{ columnValue: row[idx] },
      }
    })

    async function deleteTableRow() {
      try {
        await Database.deleteTableRow(db, table, { whereColumns: deleteRow })
        selectTableRow(1)
        Modal.success({
          title: t('data_manager.delete_success_txt'),
        })
      } catch (e) {
        Modal.error({
          title: t('data_manager.delete_failed_txt'),
          content: <Pre>{e.message}</Pre>,
        })
      }
    }

    deleteTableRow()
    setConfirmModalVisible(false)
  }

  const Pagination = () => {
    const submitPage = (values) => {
      if (values.pageNum < 1) {
        return
      } else {
        setPageNumb(values.pageNum)
      }
    }
    return (
      <>
        {(tableInfo.rows.length > 0 ||
          (tableInfo.rows.length == 0 && pageNum > 1)) && (
          <Form onFinish={submitPage} style={{ marginTop: '2rem' }}>
            <BackwardOutlined
              onClick={() =>
                pageNum > 1 &&
                !tableInfo.isPaginationUnavailable &&
                setPageNumb(pageNum - 1)
              }
            />
            <Form.Item name="pageNum" initialValue={pageNum} noStyle>
              <Input
                style={{ width: '5rem' }}
                value={pageNum}
                disabled={!tableInfo.isPaginationUnavailable ? false : true}
              />
            </Form.Item>
            <ForwardOutlined
              onClick={() =>
                !tableInfo.isPaginationUnavailable && setPageNumb(pageNum + 1)
              }
            />
            {tableInfo.allRowsBeforeTruncation &&
              tableInfo.allRowsBeforeTruncation < tableInfo.rows.length && (
                <Tooltip
                  placement="leftTop"
                  title={`该表仅能显示前 ${tableInfo.allRowsBeforeTruncation} 行记录，可使用 SQL 语句自行查询更多行。`}
                >
                  <QuestionCircleOutlined />
                </Tooltip>
              )}
          </Form>
        )}
      </>
    )
  }

  return (
    <>
      <Head
        title={db}
        back={
          <a onClick={() => navigate(-1)}>
            <ArrowLeftOutlined /> {t('data_manager.head_back_all_tables')}
          </a>
        }
        titleExtra={
          <Button
            onClick={showFormModal({
              type: 'insertRow',
              title: t('data_manager.select_table.insert_row'),
            })}
          >
            <TableOutlined />
            {t('data_manager.select_table.insert_row')}
          </Button>
        }
      />

      <Card>
        {tableInfo && (
          <>
            <Table
              style={{ overflow: 'auto' }}
              columns={tableInfo.columns
                .map((column, idx) => {
                  return {
                    ...{ title: column.name },
                    ...{ key: idx },
                    ...{ dataIndex: idx },
                  }
                })
                .concat([
                  {
                    title: t('data_manager.action'),
                    key: 'action',
                    render: (row) => (
                      <>
                        <a
                          onClick={showFormModal({
                            title: t('data_manager.select_table.edit_row'),
                            type: 'editRow',
                            message: '',
                            rowInfo: row,
                          })}
                        >
                          {t('dbusers_manager.edit')}
                        </a>
                        <Divider type="vertical" />
                        <a
                          onClick={showFormModal({
                            title: t('data_manager.select_table.delete_row'),
                            type: 'deleteRow',
                            message: '',
                            rowInfo: row,
                          })}
                        >
                          <Typography.Text type="danger">
                            {t('data_manager.delete')}
                          </Typography.Text>
                        </a>
                      </>
                    ),
                  },
                ])}
              dataSource={tableInfo.rows.map((data, i) => {
                const obj = {}
                obj['key'] = i
                data.map((row, idx) => {
                  obj[idx] = row
                })
                return obj
              })}
              pagination={false}
            />
            <FormModal />
            <ConfirmModal />
            <Pagination />
          </>
        )}
      </Card>
    </>
  )
}
