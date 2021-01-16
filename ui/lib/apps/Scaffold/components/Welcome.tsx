import React from 'react'

interface IWelcomeProps {
  title: string
}

export default function Welcome({ title }: IWelcomeProps) {
  return <h1>{title}</h1>
}
