export const SuggestedCommandMaps: Record<
  string,
  (params: string[]) => string
> = {
  execute_command: (params: string[]) => {
    return `${params.join(',')}`
  },
  table_without_where_condition: (params: string[]) => {
    return `${params[0]} without where condition in the query`
  },
  table_where_condition_with_func: (params: string[]) => {
    return `Where conditions of the ${params[0]}  using funcs, it would cause index invalid`
  },
  query_cannot_be_tuned_find_other_help: () => {
    return `The query can't be tuned. Please ask DBA for help`
  },
  Found_index_in_table: () => {
    return `Foud correct index in the table`
  }
}

export function getSuggestedCommand(suggestion_key: string, params: string[]) {
  return SuggestedCommandMaps[suggestion_key]
    ? SuggestedCommandMaps[suggestion_key](params)
    : suggestion_key
}
