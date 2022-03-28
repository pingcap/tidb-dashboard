import React, { useLayoutEffect, useRef, useEffect, useState } from 'react'
import { OrgChart } from 'd3-org-chart'
import * as d3 from 'd3'

export default function VisualPlan() {
  const d3Container = useRef(null)
  let chart = new OrgChart()

  const treeData = {
    name: 'HashJoin_9',
    cost: '101530.25',
    est_rows: '4162.50',
    act_rows: '0',
    access_table: '',
    access_index: '',
    access_partition: '',
    time_us: '628.9µs',
    run_at: 'root',
    children: [
      {
        name: 'TableReader_12(Build)',
        cost: '43608.83',
        est_rows: '3330.00',
        act_rows: '0',
        access_table: '',
        access_index: '',
        access_partition: '',
        time_us: '65.9µs',
        run_at: 'root',
        children: [
          {
            name: 'Selection_11',
            cost: '600020.00',
            est_rows: '3330.00',
            act_rows: '0',
            access_table: '',
            access_index: '',
            access_partition: '',
            time_us: '0s',
            run_at: 'cop[tikv]',
            children: [
              {
                name: 'TableFullScan_10',
                cost: '570020.00',
                est_rows: '10000.00',
                act_rows: '0',
                access_object: 'table:t1',
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
            access_table: '',
            access_index: '',
            access_partition: '',
            time_us: '0s',
            run_at: 'cop[tikv]',
            children: [
              {
                name: 'TableFullScan_1000000',
                cost: '570020.00',
                est_rows: '10000.00',
                act_rows: '0',
                access_object: 'table:t1',
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
        access_table: '',
        access_index: '',
        access_partition: '',
        time_us: '236.6µs',
        run_at: 'root',
        children: [
          {
            name: 'Selection_14',
            cost: '600020.00',
            est_rows: '9990.00',
            act_rows: '0',
            access_table: '',
            access_index: '',
            access_partition: '',
            time_us: '0s',
            run_at: 'cop[tikv]',
            children: [
              {
                name: 'TableFullScan_13',
                est_rows: '10000.00',
                cost: '570020.00',
                act_rows: '0',
                access_object: 'table:t2',
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
      // console.log("test", obj)
      return
    }
    //console.log(Object.keys(obj))
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
      obj['width'] = 300
      obj['height'] = 100
      recursivefn(obj.children, obj.name)
    }
  }
  recursivefn(treeData, '')
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

        if (key == 'children' && Array.isArray(value)) {
          value.map((el) => {
            flattenObject(el)
          })
        } else {
          flattened[key] = value
        }
      })
      flattened['expanded'] = true
      arr.push(flattened)
    }
  }
  flattenObject(treeData)

  useLayoutEffect(() => {
    if (d3Container.current) {
      chart
        .container(d3Container.current)
        .data(arr)
        .nodeWidth((d) => 200)
        .nodeHeight((d) => 120)
        .onNodeClick((d, i, arr) => {
          console.log(d, 'Id of clicked node ')
        })
        .nodeContent(function (d, i, arr, state) {
          const color = '#FFFFFF'
          return `
                    <div style="font-family: 'Inter', sans-serif;background-color:${color}; position:absolute;margin-top:-1px; margin-left:-1px;width:${d.width}px;height:${d.height}px;border-radius:10px;border: 1px solid #E4E2E9">
                      
                      <div style="color:#08011E;position:absolute;right:20px;top:17px;font-size:10px;"><i class="fas fa-ellipsis-h"></i></div>
        
                      <div style="font-size:15px;color:#08011E;margin-left:20px;margin-top:32px"> ${d.data.name} </div>
                      <div style="color:#716E7B;margin-left:20px;margin-top:3px;font-size:12px;"> cost: ${d.data.cost} </div>
                     
                      <div style="color:#716E7B;margin-left:20px;margin-top:3px;font-size:12px;"> run_at: ${d.data.run_at} </div>
                      <div style="color:#716E7B;margin-left:20px;margin-top:3px;font-size:12px;"> time_us: ${d.data.time_us} </div>
        
        
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
