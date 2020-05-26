import _ from 'lodash'

export default function getApiErrorsMsg(errors: any[]) {
  return _.uniq(
    _.map(errors, (err) => err?.response?.data?.message || '')
  ).join('; ')
}
