import React from 'react'
import StoreLocationTree, {
  buildTreeData,
  trimDuplicate,
  getShortStrMap
} from '.'

export default {
  title: 'StoreLocationTree'
}

const dataSource1 = {
  name: 'Stores',
  value: '',
  children: [
    {
      name: 'zone',
      value: 'sh',
      children: [
        {
          name: 'rack',
          value: 'r1',
          children: [
            {
              name: 'host',
              value: 'h1',
              children: [
                {
                  name: 'TiKV',
                  value: '127.0.0.1:20160',
                  children: []
                }
              ]
            },
            {
              name: 'host',
              value: 'h2',
              children: [
                {
                  name: 'TiKV',
                  value: '127.0.0.1:20162',
                  children: []
                }
              ]
            }
          ]
        }
      ]
    },
    {
      name: 'zone',
      value: 'bj',
      children: [
        {
          name: 'rack',
          value: 'r1',
          children: [
            {
              name: 'host',
              value: 'h1',
              children: [
                {
                  name: 'TiKV',
                  value: '127.0.0.1:20161',
                  children: []
                }
              ]
            }
          ]
        },
        {
          name: 'TiFlash',
          value: '127.0.0.1:3930',
          children: []
        }
      ]
    }
  ]
}

export const Normal = () => <StoreLocationTree dataSource={dataSource1} />

const dataSource2 = {
  name: 'Stores',
  value: '',
  children: [
    {
      name: 'failure-domain.beta.kubernetes.io/region',
      value: 'us-west1',
      children: [
        {
          name: 'failure-domain.beta.kubernetes.io/zone',
          value: 'us-west1-a',
          children: [
            {
              name: 'kubernetes.io/hostname',
              value:
                'shoot--stating--a13df0bd-56f54530-z1-111111-tkq7r.internal',
              children: [
                {
                  name: 'TiFlash',
                  value: 'db-tiflash-0.db-tiflash-peer.tidb1373',
                  children: []
                }
              ]
            },
            {
              name: 'kubernetes.io/hostname',
              value:
                'shoot--stating--a13df0bd-b8cdec65-z1-22222-fdsaf.internal',
              children: [
                {
                  name: 'TiKV',
                  value: 'db-tikv-0.db-tikv-peer.tidb1373',
                  children: []
                }
              ]
            }
          ]
        },
        {
          name: 'failure-domain.beta.kubernetes.io/zone',
          value: 'us-west1-b',
          children: [
            {
              name: 'kubernetes.io/hostname',
              value:
                'shoot--stating--a13df0bd-xxxxxxxxxx-z1-33333-xxxxx.internal',
              children: [
                {
                  name: 'TiKV',
                  value: 'db-tikv-1.db-tikv-peer.tidb1373',
                  children: []
                }
              ]
            }
          ]
        },
        {
          name: 'failure-domain.beta.kubernetes.io/zone',
          value: 'us-west1-c',
          children: [
            {
              name: 'kubernetes.io/hostname',
              value: 'shoot--stating--a13df0bd-yyyyy-z1-33333-mmmm.internal',
              children: [
                {
                  name: 'TiKV',
                  value: 'db-tikv-2.db-tikv-peer.tidb1373',
                  children: []
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}

export const Kubernetes = () => <StoreLocationTree dataSource={dataSource2} />

/////////////////////////////

const arr1 = [
  'aaa-bbbb-111a.abc.123',
  'aaa-bbbb-222a.abc.123',
  'aaa-bbbb-333a.abc.123'
]
const arr2 = ['aaa-111a.abc.123', 'aaa-222a.abc.123', 'aaa-333a.abc.123']
const arr3 = []
const arr4 = ['abc']
const arr5 = ['abcd', 'abce']
console.log(trimDuplicate(arr1))
console.log(trimDuplicate(arr2))
console.log(trimDuplicate(arr3))
console.log(trimDuplicate(arr4))
console.log(trimDuplicate(arr5))

/////////////////////////////

const data1 = {
  location_labels: [
    'failure-domain.beta.kubernetes.io/region',
    'failure-domain.beta.kubernetes.io/zone',
    'kubernetes.io/hostname'
  ],
  stores: [
    {
      address: 'db-tiflash-0.db-tiflash-peer.tidb1373',
      labels: {
        engine: 'tiflash',
        'failure-domain.beta.kubernetes.io/region': 'us-west1',
        'failure-domain.beta.kubernetes.io/zone': 'us-west1-a',
        'kubernetes.io/hostname':
          'shoot--stating--a13df0bd-56f54530-z1-111111-tkq7r.internal'
      }
    },
    {
      address: 'db-tikv-0.db-tikv-peer.tidb1373',
      labels: {
        engine: '',
        'failure-domain.beta.kubernetes.io/region': 'us-west1',
        'failure-domain.beta.kubernetes.io/zone': 'us-west1-a',
        'kubernetes.io/hostname':
          'shoot--stating--a13df0bd-b8cdec65-z1-22222-fdsaf.internal'
      }
    },
    {
      address: 'db-tikv-1.db-tikv-peer.tidb1373',
      labels: {
        engine: '',
        'failure-domain.beta.kubernetes.io/region': 'us-west1',
        'failure-domain.beta.kubernetes.io/zone': 'us-west1-b',
        'kubernetes.io/hostname':
          'shoot--stating--a13df0bd-xxxxxxxxxx-z1-33333-xxxxx.internal'
      }
    },
    {
      address: 'db-tikv-2.db-tikv-peer.tidb1373',
      labels: {
        engine: '',
        'failure-domain.beta.kubernetes.io/region': 'us-west1',
        'failure-domain.beta.kubernetes.io/zone': 'us-west1-c',
        'kubernetes.io/hostname':
          'shoot--stating--a13df0bd-yyyyy-z1-33333-mmmm.internal'
      }
    }
  ]
}

const dataSource = buildTreeData(data1)
const shortStrMap = getShortStrMap(data1)
console.log(shortStrMap)

export const KubernetesByShort = () => (
  <StoreLocationTree dataSource={dataSource} shortStrMap={shortStrMap} />
)

/////////////////////////////
