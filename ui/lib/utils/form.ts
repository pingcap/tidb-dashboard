const hiddenProps = {
  style: {
    display: 'none',
  },
}

const showProps = {}

export function setHidden(hidden: boolean) {
  return hidden ? hiddenProps : showProps
}
