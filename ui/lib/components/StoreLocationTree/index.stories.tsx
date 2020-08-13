import React from 'react'
import StoreLocationTree from '.'

export default {
  title: 'StoreLocationTree',
}

const dataSource1 = {
  name: 'labels',
  children: [
    {
      name: 'sh',
      children: [
        {
          name: 'r1',
          children: [
            {
              name: 'h1',
              children: [
                {
                  name: '127.0.0.1:20160',
                  children: [],
                },
              ],
            },
            {
              name: 'h2',
              children: [
                {
                  name: '127.0.0.1:20161',
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'bj',
      children: [
        {
          name: 'r1',
          children: [
            {
              name: 'h1',
              children: [
                {
                  name: '127.0.0.1:20162',
                  children: [],
                },
              ],
            },
          ],
        },
        {
          name: '127.0.0.1:3930',
          children: [],
        },
      ],
    },
  ],
}

export const onlyName = () => <StoreLocationTree dataSource={dataSource1} />

const dataSource2 = {
  name: 'labels',
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
                  name: 'address',
                  value: '127.0.0.1:20160',
                  children: [],
                },
              ],
            },
            {
              name: 'host',
              value: 'h2',
              children: [
                {
                  name: 'address',
                  value: '127.0.0.1:20162',
                  children: [],
                },
              ],
            },
          ],
        },
      ],
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
                  name: 'address',
                  value: '127.0.0.1:20161',
                  children: [],
                },
              ],
            },
          ],
        },
        {
          name: 'address',
          value: '127.0.0.1:3930',
          children: [],
        },
      ],
    },
  ],
}

export const nameAndValue = () => <StoreLocationTree dataSource={dataSource2} />
