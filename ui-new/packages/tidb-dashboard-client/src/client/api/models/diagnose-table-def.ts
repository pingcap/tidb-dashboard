/* tslint:disable */
/* eslint-disable */
/**
 * Dashboard API
 * No description provided (generated by Openapi Generator https://github.com/openapitools/openapi-generator)
 *
 * The version of the OpenAPI document: 1.0
 *
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { DiagnoseTableRowDef } from './diagnose-table-row-def'

/**
 *
 * @export
 * @interface DiagnoseTableDef
 */
export interface DiagnoseTableDef {
  /**
   * The category of the table, such as [TiDB]
   * @type {Array<string>}
   * @memberof DiagnoseTableDef
   */
  category?: Array<string>
  /**
   *
   * @type {Array<string>}
   * @memberof DiagnoseTableDef
   */
  column?: Array<string>
  /**
   *
   * @type {string}
   * @memberof DiagnoseTableDef
   */
  comment?: string
  /**
   *
   * @type {Array<DiagnoseTableRowDef>}
   * @memberof DiagnoseTableDef
   */
  rows?: Array<DiagnoseTableRowDef>
  /**
   *
   * @type {string}
   * @memberof DiagnoseTableDef
   */
  title?: string
}
