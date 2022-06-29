import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export function useLocationChange() {
  // https://thewebdev.info/2022/03/07/how-to-detect-route-change-with-react-router/
  const location = useLocation()
  useEffect(() => {
    const event = new CustomEvent('dashboard:route-change', {
      detail: { location }
    })
    window.dispatchEvent(event)
  }, [location])
}
