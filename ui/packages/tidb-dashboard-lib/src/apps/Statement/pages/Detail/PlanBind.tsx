import React, { useContext, useState, useMemo, useRef, useEffect } from 'react'
import { Space, Button, Modal } from 'antd'

import { useClientRequest } from '@lib/utils/useClientRequest'
import { StatementModel } from '@lib/client'
import { IPageQuery } from '.'
import { StatementContext } from '../../context'
import { CardTable } from '@lib/components'
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

  const handleModalVisibility = (visibility: boolean) => {
    setShowPlanBindModal(visibility)
  }

  const handleSetBoundPlanDigets = (planDigest: string | null) => {
    setBoundPlanDigest(planDigest)
  }

  useEffect(() => {
    if (planBindingStatus) {
      setBoundPlanDigest(planBindingStatus.plan_digest!)
    }
  }, [planBindingStatus])

  return (
    <Space align="center">
      {boundPlanDigest ? 'Bound' : 'Not Bound'}
      <Button onClick={() => handleModalVisibility(true)}>Plan Binding</Button>
      <PlanBindModal
        showPlanBindModal={showPlanBindModal}
        boundPlanDigest={boundPlanDigest}
        plans={plans}
        sqlDigest={query.digest!}
        onHandleModalVisibility={handleModalVisibility}
        onHandleSetBoundPlanDigets={handleSetBoundPlanDigets}
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
  const handleOnCancel = () => {
    onHandleModalVisibility(false)
  }
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [isBinding, setIsBinding] = useState(false)
  const [isDropping, setIsDropping] = useState(false)

  const handlePlanBind = async () => {
    setIsBinding(true)
    try {
      const res = await ctx!.ds.statementsPlanBindCreate!(selectedPlan!)
      if (res.data === 'success') {
        onHandleSetBoundPlanDigets(selectedPlan!)
      }
    } catch (error) {
      console.log(error)
    } finally {
      setIsBinding(false)
    }
  }

  const handleDropPlan = async () => {
    setIsDropping(true)
    try {
      const res = await ctx!.ds.statementsPlanBindDelete!(sqlDigest)
      if (res.data === 'success') {
        setSelectedPlan(null)
        onHandleSetBoundPlanDigets(null)
        console.log('drop plan success')
      }
    } catch (error) {
      console.log(error)
    } finally {
      setIsDropping(false)
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
        <Space>
          <span>Plan Bind Modal</span>
          <span>{boundPlanDigest ? 'Bound' : 'Not Bound'}</span>{' '}
        </Space>
      }
      onCancel={handleOnCancel}
      width={1000}
      footer={
        <div style={{ textAlign: 'center' }}>
          {boundPlanDigest ? (
            <Button
              onClick={handleDropPlan}
              loading={isDropping}
              disabled={isDropping}
            >
              {isDropping ? 'Dropping...' : 'Drop'}
            </Button>
          ) : (
            <Button
              onClick={handlePlanBind}
              loading={isBinding}
              disabled={isBinding || !selectedPlan}
            >
              {isBinding ? 'Binding...' : 'Bind'}
            </Button>
          )}
        </div>
      }
      destroyOnClose
    >
      <ModalContent
        boundPlanDigest={boundPlanDigest}
        plans={plans}
        sqlDigest={sqlDigest}
        isBinding={isBinding}
        isDropping={isDropping}
        onHandleSelectedPlanChange={handleSelectedPlanChange}
      />
    </Modal>
  )
}

interface ModalContentProps {
  boundPlanDigest: string | null
  plans: StatementModel[]
  sqlDigest: string
  isBinding: boolean
  isDropping: boolean
  onHandleSelectedPlanChange: (plan: StatementModel[] | []) => void
}

const ModalContent = ({
  boundPlanDigest,
  plans,
  sqlDigest,
  isBinding,
  isDropping,
  onHandleSelectedPlanChange
}: ModalContentProps) => {
  return (
    <>
      <p>
        Notice: This feature does not work for queries with subqueries, queries
        that access TiFlash, or queries that join 3 or more tables.
      </p>
      <p>Bind this SQL</p>
      <pre style={{ background: '#f1f1f1', padding: '10px' }}>{sqlDigest}</pre>
      <p>to a special plan</p>
      {!isBinding && !isDropping && (
        <PlanTable
          plans={plans}
          boundPlanDigest={boundPlanDigest}
          onHandleSelectedPlanChange={onHandleSelectedPlanChange}
        />
      )}
    </>
  )
}

const PlanTable = ({ boundPlanDigest, plans, onHandleSelectedPlanChange }) => {
  const planColumns = useMemo(() => genPlanColumns(plans || []), [plans])

  const selection = useRef(
    new Selection({
      canSelectItem: (item) => {
        const digest = (item as StatementModel).plan_digest
        return !boundPlanDigest
          ? true
          : digest === boundPlanDigest
          ? true
          : false
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
    boundPlanDigest = boundPlanDigest
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
    />
  )
}

export default PlanBind
