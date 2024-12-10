/**
 * Generated by orval v6.12.1 🍺
 * Do not edit manually.
 * Cluster APIs for TiDB Cloud
 * OpenAPI spec version: alpha
 */

export type ListIndexAdvicesParams = {
  /**
   * The number of pages.
   */
  page_token?: number
  /**
   * The size of a page.
   */
  page_size?: number
  /**
   * The state to filter result.
   */
  state_filter?: string
  /**
   * The name of database or table to filter result.
   */
  name_filter?: string
  /**
   * The column used to order result.
   */
  order_by?: string
  /**
   * If ordered result should be in descending order.
   */
  desc?: boolean
}