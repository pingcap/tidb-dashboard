const hiddenProps = {
  style: {
    display: 'none',
  },
}

const displayProps = {}

export function setHidden(hidden: boolean) {
  return hidden ? hiddenProps : displayProps
}
