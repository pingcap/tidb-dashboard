import React from 'react'
import { Configuration, EstimateCapacity, Metrics } from '../components'

export const Home: React.FC = () => {
  return (
    <div>
      <Configuration />
      <EstimateCapacity />
      <Metrics />
    </div>
  )
}
