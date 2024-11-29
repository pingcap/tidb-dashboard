# @pingcap-incubator/tidb-dashboard-lib-charts

## Usage

### Step 1

Import style css

```ts
import "@pingcap-incubator/tidb-dashboard-lib-charts/dist/style.css"
```

### Step 2

Use `ChartThemeSwitch` component in the top level (for example `App` component)

```tsx
function Routes() {
  const theme = useComputedColorScheme()

  return (
    <Router>
      <Stack p={16}>
        {/* ... */}
        <ChartThemeSwitch value={theme} />
      </Stack>
    </Router>
  )
}
```

### Step 3

Render series data by `SeriesChart` component

```tsx
<SeriesChart
  unit={config.unit}
  data={seriesData}
  timeRange={tr}
  theme={colorScheme}
/>
```
