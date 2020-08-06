import React from 'react'
import StoreLocation from '.'

const dataSource = {
  name: 'zone',
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
export default {
  title: 'StoreLocation',
}

export const SLT = () => (
  <StoreLocation title="SLT" dataSource={dataSource} type="tree" />
)