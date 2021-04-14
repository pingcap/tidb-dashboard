# Dependency Injection (DI) Documentation

This document describes how the simple DI function works in React.

And we can organize the code in a more SOLID way through the SOA arch.

## Usage

Define service & token:

```tsx
// MyService.ts
import { useToken } from '@lib/utils/di'

// service impl
export const useMyService = () => {
  // ...
}

// service token
export const MyService = useToken(useMyService)
```

Provide services:

```tsx
// HostComponent.tsx
import { useMyService, MyService } from 'MyService.ts'

export default function HostComponent() {
  return (
    <MyService.Provider value={useMyService()}>
      // may have other providers ...
      <SomeOtherComponents />
      ...
    </MyService.Provider>
  )
}
```

Inject services and consume:

```tsx
// MyComponent.tsx
import React, { useContext } from 'react'
import { MyService } from 'MyService.ts'

export default function MyComponent() {
  const myService = useContext(MyService)
  ...
}
```
