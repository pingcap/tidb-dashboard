import React from 'react'

// interface ChartPointer {
//     ref: React.RefObject<Chart> | null
//     event: PointerEvent | null
// }

// const createDefaultChartPointer = (): ChartPointer => ({
//     ref: null,
//     event: null
// })

// const useChartPointer = () => useState<ChartPointer>(createDefaultChartPointer())

// export const ChartContext = React.createContext<ReturnType<typeof useChartPointer>>(null as any)

export const ChartContext = React.createContext(null as any)
