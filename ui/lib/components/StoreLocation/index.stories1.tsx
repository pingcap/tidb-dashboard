import React from 'react'
import StoreLocation from '.'

const dataSource = {
  children: [
    {
      children: [
        {
          children: [
            {
              children: [],
              name: "低压车间表计82",
            },
          ],
          name: "低压关口表计1",
        },
      ],
      name: "高压子表计122",
    },
    {
      children: [
        {
          children: [],
          name: "低压关口表计101",
        },
      ],
      name: "高压子表计141",
    },
  ],
  name: "高压总表计102",
};
export default {
  title: 'StoreLocation',
}


export const SLT = () => (
  <StoreLocation
  title="SLT"
  dataSource={dataSource}
  type="tree"
  />
)

