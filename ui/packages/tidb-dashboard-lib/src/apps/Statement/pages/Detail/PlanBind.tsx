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

  const [boundPlanDigets, setBoundPlanDigets] = useState<string | null>(null)
  const [showPlanBindModal, setShowPlanBindModal] = useState(false)

  const handleModalVisibility = (visibility: boolean) => {
    setShowPlanBindModal(visibility)
  }

  const handleSetBoundPlanDigets = (planDigest: string | null) => {
    setBoundPlanDigets(planDigest)
  }

  useEffect(() => {
    if (planBindingStatus) {
      setBoundPlanDigets(planBindingStatus.plan_digest!)
    }
  }, [planBindingStatus])

  return (
    <Space align="center">
      {boundPlanDigets ? 'Bound' : 'Not Bound'}
      <Button onClick={() => handleModalVisibility(true)}>Plan Binding</Button>
      <PlanBindModal
        showPlanBindModal={showPlanBindModal}
        boundPlanDigets={boundPlanDigets}
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
  boundPlanDigets: string | null
  plans: StatementModel[]
  sqlDigest: string
  onHandleModalVisibility: (visibility: boolean) => void
  onHandleSetBoundPlanDigets: (planDigest: string | null) => void
}

const PlanBindModal = ({
  showPlanBindModal,
  boundPlanDigets,
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
          <span>{boundPlanDigets ? 'Bound' : 'Not Bound'}</span>{' '}
        </Space>
      }
      onCancel={handleOnCancel}
      width={1000}
      footer={
        <div style={{ textAlign: 'center' }}>
          {boundPlanDigets ? (
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
        boundPlanDigets={boundPlanDigets}
        plans={plans}
        sqlDigest={sqlDigest}
        onHandleSelectedPlanChange={handleSelectedPlanChange}
      />
    </Modal>
  )
}

interface ModalContentProps {
  boundPlanDigets: string | null
  plans: StatementModel[]
  sqlDigest: string
  onHandleSelectedPlanChange: (plan: StatementModel[] | []) => void
}

const ModalContent = ({
  boundPlanDigets,
  plans,
  sqlDigest,
  onHandleSelectedPlanChange
}: ModalContentProps) => {
  const planColumns = useMemo(() => genPlanColumns(plans || []), [plans])
  const selection = useRef(
    new Selection({
      canSelectItem: (item) => {
        const digest = (item as StatementModel).plan_digest
        return !boundPlanDigets
          ? true
          : digest === boundPlanDigets
          ? true
          : false
      },
      onSelectionChanged: () => {
        const s = selection.current.getSelection() as StatementModel[]
        onHandleSelectedPlanChange(s)
        if (!boundPlanDigets) return
        const selectedPlanIndex = plans.findIndex(
          (v) => v.plan_digest === boundPlanDigets
        )

        if (s.length === 0) {
          selection.current.setIndexSelected(selectedPlanIndex, true, true)
        }
      }
    })
  )

  useEffect(() => {
    console.log('useEffect boundPlanDigets', boundPlanDigets)
    if (boundPlanDigets && plans.length > 0) {
      // selection.current.canSelectItem = (item) => {
      //   const digest = (item as StatementModel).plan_digest
      //   return digest === boundPlanDigets ? true : false
      // }
      const selectedPlanIndex = plans.findIndex(
        (v) => v.plan_digest === boundPlanDigets
      )

      selection.current.setIndexSelected(selectedPlanIndex, true, true)
    } else if (!boundPlanDigets) {
      selection.current.setAllSelected(false)
    }
  }, [boundPlanDigets])

  return (
    <>
      <p>
        Notice: This feature does not work for queries with subqueries, queries
        that access TiFlash, or queries that join 3 or more tables.
      </p>
      <p>Bind this SQL</p>
      <pre style={{ background: '#f1f1f1', padding: '10px' }}>{sqlDigest}</pre>
      <p>to a special plan</p>
      {plans && plans.length > 0 && (
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
      )}
    </>
  )
}

export default PlanBind
