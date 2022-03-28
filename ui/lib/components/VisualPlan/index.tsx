import React, { useLayoutEffect, useRef, useEffect, useState } from 'react'
import { OrgChart } from 'd3-org-chart'
import * as d3 from 'd3'

export default function VisualPlan() {
  const d3Container = useRef(null)
  let chart = new OrgChart()

  let minCost = Infinity,
    maxCost = 0

  const treeData = {
    name: 'HashJoin_9',
    cost: '101530.25',
    est_rows: '4162.50',
    act_rows: '0',
    access_table: 'access_table',
    access_index: 'access_index',
    access_partition: 'access_partition',
    time_us: '628.9µs',
    run_at: 'root',
    children: [
      {
        name: 'TableReader_12(Build)',
        cost: '43608.83',
        est_rows: '3330.00',
        act_rows: '0',
        access_table: 'access_table',
        access_index: 'access_index',
        access_partition: 'access_partition',
        time_us: '65.9µs',
        run_at: 'root',
        children: [
          {
            name: 'Selection_11',
            cost: '600020.00',
            est_rows: '3330.00',
            act_rows: '0',
            access_table: 'access_table',
            access_index: 'access_index',
            access_partition: 'access_partition',
            time_us: '0s',
            run_at: 'cop[tikv]',
            children: [
              {
                name: 'TableFullScan_10',
                cost: '570020.00',
                est_rows: '10000.00',
                act_rows: '0',
                access_table: 'access_table',
                access_index: 'access_index',
                access_partition: 'access_partition',
                time_us: '0s',
                run_at: 'cop[tikv]',
              },
            ],
          },
          {
            name: 'Selection_111111',
            cost: '600020.00',
            est_rows: '3330.00',
            act_rows: '0',
            access_table: 'access_table',
            access_index: 'access_index',
            access_partition: 'access_partition',
            time_us: '0s',
            run_at: 'cop[tikv]',
            children: [
              {
                name: 'TableFullScan_1000000',
                cost: '570020.00',
                est_rows: '10000.00',
                act_rows: '0',
                access_table: 'access_table',
                access_index: 'access_index',
                access_partition: 'access_partition',
                time_us: '0s',
                run_at: 'cop[tikv]',
              },
            ],
          },
        ],
      },
      {
        name: 'TableReader_15(Probe)',
        cost: '45412.58',
        est_rows: '9990.00',
        act_rows: '0',
        access_table: 'access_table',
        access_index: 'access_index',
        access_partition: 'access_partition',
        time_us: '236.6µs',
        run_at: 'root',
        children: [
          {
            name: 'Selection_14',
            cost: '600020.00',
            est_rows: '9990.00',
            act_rows: '0',
            access_table: 'access_table',
            access_index: 'access_index',
            access_partition: 'access_partition',
            time_us: '0s',
            run_at: 'cop[tikv]',
            children: [
              {
                name: 'TableFullScan_13',
                est_rows: '10000.00',
                cost: '570020.00',
                act_rows: '0',
                access_table: 'access_table',
                access_index: 'access_index',
                access_partition: 'access_partition',
                time_us: '0s',
                run_at: 'cop[tikv]',
              },
            ],
          },
        ],
      },
    ],
  }

  const recursivefn = (obj, name) => {
    if (obj == undefined) {
      return
    }
    if (Array.isArray(obj)) {
      obj.map((el) => {
        el['parentNodeId'] = name
        el['nodeId'] = el.name
        el['width'] = 300
        el['height'] = 100
        recursivefn(el.children, el.name)
      })
    } else {
      obj['parentNodeId'] = name
      obj['nodeId'] = obj.name
      obj['width'] = 500
      obj['height'] = 100
      recursivefn(obj.children, obj.name)
    }
  }
  recursivefn(treeData, '')
  console.log('treeData', treeData)
  const arr: Object[] = []
  const flattenObject = (obj) => {
    if (obj == undefined) {
      // console.log("test", obj)
      return
    }
    const flattened = {}
    if (!Array.isArray(obj)) {
      Object.keys(obj).forEach((key) => {
        const value = obj[key]

        if (key === 'children' && Array.isArray(value)) {
          value.map((el) => {
            flattenObject(el)
          })
        } else {
          flattened[key] = value
          // console.log('not children obj', obj)
          if (key === 'cost') {
            if (Number(obj[key]) < Number(minCost)) {
              minCost = obj[key]
            } else if (Number(obj[key]) > Number(maxCost)) {
              maxCost = obj[key]
            }
          }
        }
      })
      flattened['expanded'] = true
      arr.push(flattened)
    }
  }
  flattenObject(treeData)

  const scale = (inputCost: number): number => {
    const [minC, maxC] = [minCost, maxCost]
    const [rangeMin, rangeMax] = [0, 1]

    const percent = (rangeMin - rangeMax) / (minC - maxC)
    const costInRange = percent * inputCost

    return costInRange
  }

  console.log('result arr =====', arr)

  useLayoutEffect(() => {
    if (d3Container.current) {
      chart
        .container(d3Container.current as any)
        .data(arr)
        // .nodeWidth((d) => {
        //   console.log('d in ==== ', d)
        //   return
        // })
        // .nodeHeight((d) => 150)
        .onNodeClick((d) => {
          console.log('click d is', d, d.id)
        })
        .nodeContent(function (d: any, i, arr, state) {
          console.log('d', d, d.height, d.width)
          const color = '#FFFFFF'
          return `
              <div style="font-family: 'Inter', sans-serif;background-color:${color}; position:absolute;margin-top:-1px; margin-left:-1px;width:${d.width}px;height:${d.height}px; border: 1px solid #E4E2E9">

              <div style="width:100%;position:relative;background-color:${d3.interpolateReds(
                scale(d.data.cost)
              )}; display: flex;">
                <div style="padding: 15px;"> ${d.data.name} </div>
                <div style="padding: 15px 0;">${d.data.time_us} | 100%</div>
              </div>

              <div style="color:#716E7B;margin-left:20px;margin-top:3px;font-size:12px;"> cost: ${
                d.data.act_rows
              } </div>

              <div style="color:#716E7B;margin-left:20px;margin-top:3px;font-size:12px;"> run_at: ${
                d.data.est_rows
              } </div>
              <div style="color:#716E7B;margin-left:20px;margin-top:3px;font-size:12px;"> time_us: ${
                d.data.run_at
              } </div>
              <div style="visibility: hidden;">
                <div style="color:#716E7B;margin-left:20px;margin-top:3px;font-size:12px;"> cost: ${
                  d.data.cost
                } </div>
                <div style="color:#716E7B;margin-left:20px;margin-top:3px;font-size:12px;"> run_at: ${
                  d.data.access_table
                } </div>
                <div style="color:#716E7B;margin-left:20px;margin-top:3px;font-size:12px;"> time_us: ${
                  d.data.access_index
                } </div>
                <div style="color:#716E7B;margin-left:20px;margin-top:3px;font-size:12px;"> time_us: ${
                  d.data.access_partition
                } </div>
              </div>
            </div>
          `
        })
        .render()
    }
  })

  return (
    <div>
      <div ref={d3Container} />
    </div>
  )
}
