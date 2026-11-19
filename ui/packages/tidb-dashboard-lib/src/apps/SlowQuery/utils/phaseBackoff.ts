export function formatPhaseBackoff(
  value: string | null | undefined,
  unavailable: string,
  empty: string
) {
  return value == null ? unavailable : value === '' ? empty : value
}
