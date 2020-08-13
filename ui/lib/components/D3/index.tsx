import React, { useRef, useEffect, useState } from 'react'
import * as d3 from 'd3'

function genDataSet(): [number, number][] {
  return [1, 2, 3, 4, 5].map(() => [
    Math.floor(Math.random() * 80 + 10),
    Math.floor(Math.random() * 30 + 10),
  ])
}
const initialData = genDataSet()

export const Circles = () => {
  const [dataset, setDataset] = useState(initialData)
  const ref = useRef(null)

  useEffect(() => {
    const svgElement = d3.select(ref.current)
    svgElement
      .selectAll('circle')
      .data(dataset)
      .join('circle')
      .attr('cx', (d) => d[0])
      .attr('cy', (d) => d[1])
      .attr('r', 3)
  }, [dataset])

  useEffect(() => {
    setInterval(() => setDataset(genDataSet()), 2000)
  }, [])

  return <svg width="300px" height="150px" viewBox="0 0 100 50" ref={ref} />
}

export const Circle = () => {
  const ref = useRef(null)

  useEffect(() => {
    const svgEle = d3.select(ref.current!)
    svgEle.append('circle').attr('cx', 150).attr('cy', 70).attr('r', 50)
  }, [])

  return <svg ref={ref} style={{ border: '2px solid gold' }} />
}
