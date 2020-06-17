import { v4 as uuidv4 } from 'uuid'
import axios from 'axios'

const REPORT_API = 'https://telemetry.pingcap.com/api/v1/dashboard/report'
const UUID_KEY = 'dashboard_key'
let uuid: string = ''

function getUuid(): string {
  if (uuid) {
    return uuid
  }
  uuid = localStorage.getItem(UUID_KEY) || ''
  if (uuid) {
    return uuid
  }
  uuid = uuidv4()
  localStorage.setItem(UUID_KEY, uuid)
  return uuid
}

export function report(eventType: string, eventData: object) {
  axios.post(REPORT_API, {
    uuid: getUuid(),
    path: window.location.pathname,
    time: new Date().valueOf(),
    eventType,
    eventData,
  })
}
