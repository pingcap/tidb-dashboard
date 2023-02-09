import React, { useContext, useState, useMemo, useRef, useEffect } from 'react'
import { Space, Button, Modal, Tooltip, Radio, Alert } from 'antd'
import { InfoCircleOutlined } from '@ant-design/icons'

import { useClientRequest } from '@lib/utils/useClientRequest'
import { StatementModel } from '@lib/client'
import { useTranslation } from 'react-i18next'
import { IPageQuery } from '.'
import { StatementContext } from '../../context'
import { CardTable } from '@lib/components'
import styles from './PlanBind.module.less'
import { planColumns as genPlanColumns } from '../../utils/tableColumns'
import {
  SelectionMode,
  CheckboxVisibility
} from 'office-ui-fabric-react/lib/DetailsList'
import { Selection } from 'office-ui-fabric-react/lib/Selection'

interface PlanBindProps {
  query: IPageQuery
  plans: StatementModel[]
}

const PlanBind = ({ query, plans }: PlanBindProps) => {
  const ctx = useContext(StatementContext)
  const { t } = useTranslation()
  const { data: planBindingStatus } = useClientRequest((reqConfig) =>
    ctx!.ds.statementsPlanBindStatusGet!(
      query.digest!,
      query.beginTime!,
      query.endTime!,
      reqConfig
    )
  )

  const [boundPlanDigest, setBoundPlanDigest] = useState<string | null>(null)
  const [showPlanBindModal, setShowPlanBindModal] = useState(false)

  useEffect(() => {
    if (planBindingStatus) {
      setBoundPlanDigest(planBindingStatus.plan_digest!)
    }
  }, [planBindingStatus])

  const hasPlanToBind = plans[0].plan_can_be_bound

  return (
    <Space align="center">
      {!hasPlanToBind ? (
        <Tooltip
          title={t('statement.pages.detail.plan_bind.bound_available_tooltip')}
          placement="leftTop"
        >
          <InfoCircleOutlined /> Unavailable
        </Tooltip>
      ) : (
        <>
          {boundPlanDigest ? (
            <Space>
              <span className={styles.GreenDot} />
              {t('statement.pages.detail.plan_bind.bound')}
            </Space>
          ) : (
            <Space>
              <span className={styles.GreyDot} />
              {t('statement.pages.detail.plan_bind.not_bound')}
            </Space>
          )}
        </>
      )}

      <Button
        onClick={() => setShowPlanBindModal(true)}
        disabled={!hasPlanToBind}
      >
        {t('statement.pages.detail.plan_bind.title')}
      </Button>
      <PlanBindModal
        showPlanBindModal={showPlanBindModal}
        boundPlanDigest={boundPlanDigest}
        plans={plans}
        sqlDigest={query.digest!}
        onHandleModalVisibility={setShowPlanBindModal}
        onHandleSetBoundPlanDigets={setBoundPlanDigest}
      />
    </Space>
  )
}

interface PlanBindModalProps {
  showPlanBindModal: boolean
  boundPlanDigest: string | null
  plans: StatementModel[]
  sqlDigest: string
  onHandleModalVisibility: (visibility: boolean) => void
  onHandleSetBoundPlanDigets: (planDigest: string | null) => void
}

const PlanBindModal = ({
  showPlanBindModal,
  boundPlanDigest,
  plans,
  sqlDigest,
  onHandleModalVisibility,
  onHandleSetBoundPlanDigets
}: PlanBindModalProps) => {
  const ctx = useContext(StatementContext)
  const { t } = useTranslation()

  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handlePlanBind = async () => {
    setIsLoading(true)
    try {
      await ctx!.ds.statementsPlanBindCreate!(selectedPlan!)
      onHandleSetBoundPlanDigets(selectedPlan!)
    } catch (error) {
      console.log(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDropPlan = async () => {
    setIsLoading(true)
    try {
      await ctx!.ds.statementsPlanBindDelete!(sqlDigest)
      setSelectedPlan(null)
      onHandleSetBoundPlanDigets(null)
    } catch (error) {
      console.log(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectedPlanChange = (plan: StatementModel[] | []) => {
    if (plan.length === 0) return setSelectedPlan(null)
    return setSelectedPlan(plan[0].plan_digest!)
  }

  return (
    <Modal
      visible={showPlanBindModal}
      title={
        <Space direction="vertical">
          <Space size={10}>
            {t('statement.pages.detail.plan_bind.title')}{' '}
            {boundPlanDigest ? (
              <Space className={`${styles.SmallFont}`}>
                <span className={styles.GreenDot} />
                {t('statement.pages.detail.plan_bind.bound')}
              </Space>
            ) : (
              <Space className={`${styles.SmallFont}`}>
                <span className={styles.GreyDot} />
                {t('statement.pages.detail.plan_bind.not_bound')}
              </Space>
            )}
          </Space>
          <Alert
            type="warning"
            message={t('statement.pages.detail.plan_bind.notice')}
            className={`${styles.SmallFont}`}
          />
        </Space>
      }
      onCancel={() => onHandleModalVisibility(false)}
      width={1000}
      footer={
        <div className={styles.Center}>
          {boundPlanDigest ? (
            <Space direction="vertical">
              {t('statement.pages.detail.plan_bind.bound_status_desc')}
              <Button
                onClick={handleDropPlan}
                loading={isLoading}
                disabled={isLoading}
              >
                {t('statement.pages.detail.plan_bind.drop_btn_txt')}
              </Button>
            </Space>
          ) : (
            <Button
              onClick={handlePlanBind}
              loading={isLoading}
              disabled={isLoading || !selectedPlan}
            >
              {t('statement.pages.detail.plan_bind.bind_btn_txt')}
            </Button>
          )}
        </div>
      }
      destroyOnClose
    >
      <p>{t('statement.pages.detail.plan_bind.bound_sql')}</p>
      <pre className={`${styles.PreBlock} ${styles.SmallFont}`}>
        {sqlDigest}
      </pre>
      <p>{t('statement.pages.detail.plan_bind.to_plan')}</p>
      {!isLoading && (
        <PlanTable
          plans={plans}
          boundPlanDigest={boundPlanDigest}
          onHandleSelectedPlanChange={handleSelectedPlanChange}
        />
      )}
    </Modal>
  )
}

interface PlanTableProps {
  boundPlanDigest: string | null
  plans: StatementModel[]
  onHandleSelectedPlanChange: (plan: StatementModel[] | []) => void
}

const PlanTable = ({
  boundPlanDigest,
  plans,
  onHandleSelectedPlanChange
}: PlanTableProps) => {
  const planColumns = useMemo(() => genPlanColumns(plans || []), [plans])

  const selection = useRef(
    new Selection({
      canSelectItem: (item) => {
        const digest = (item as StatementModel).plan_digest
        return !boundPlanDigest || digest === boundPlanDigest
      },
      onSelectionChanged: () => {
        const s = selection.current.getSelection() as StatementModel[]
        onHandleSelectedPlanChange(s)
        if (!boundPlanDigest) return

        // if bound plan is selected, keep it selected
        const selectedPlanIndex = plans.findIndex(
          (v) => v.plan_digest === boundPlanDigest
        )

        if (s.length === 0) {
          selection.current.setIndexSelected(selectedPlanIndex, true, true)
        }
      }
    })
  )

  useEffect(() => {
    if (boundPlanDigest && plans.length > 0) {
      const selectedPlanIndex = plans.findIndex(
        (v) => v.plan_digest === boundPlanDigest
      )
      selection.current.setIndexSelected(selectedPlanIndex, true, true)
    } else if (!boundPlanDigest) {
      selection.current.setAllSelected(false)
    }
  }, [boundPlanDigest])

  return (
    <CardTable
      cardNoMarginTop
      cardNoMarginBottom
      columns={planColumns}
      items={plans}
      selectionMode={SelectionMode.single}
      checkboxVisibility={CheckboxVisibility.always}
      selection={selection.current}
      selectionPreservedOnEmptyClick
      onRenderCheckbox={(props) => (
        <Radio checked={props?.checked} disabled={!!boundPlanDigest} />
      )}
    />
  )
}

export default PlanBind
