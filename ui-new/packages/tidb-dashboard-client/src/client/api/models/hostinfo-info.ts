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


import { HostinfoCPUInfo } from './hostinfo-cpuinfo';
import { HostinfoCPUUsageInfo } from './hostinfo-cpuusage-info';
import { HostinfoInstanceInfo } from './hostinfo-instance-info';
import { HostinfoMemoryUsageInfo } from './hostinfo-memory-usage-info';
import { HostinfoPartitionInfo } from './hostinfo-partition-info';

/**
 * 
 * @export
 * @interface HostinfoInfo
 */
export interface HostinfoInfo {
    /**
     * 
     * @type {HostinfoCPUInfo}
     * @memberof HostinfoInfo
     */
    'cpu_info'?: HostinfoCPUInfo;
    /**
     * 
     * @type {HostinfoCPUUsageInfo}
     * @memberof HostinfoInfo
     */
    'cpu_usage'?: HostinfoCPUUsageInfo;
    /**
     * 
     * @type {string}
     * @memberof HostinfoInfo
     */
    'host'?: string;
    /**
     * Instances in the current host. The key is instance address
     * @type {{ [key: string]: HostinfoInstanceInfo; }}
     * @memberof HostinfoInfo
     */
    'instances'?: { [key: string]: HostinfoInstanceInfo; };
    /**
     * 
     * @type {HostinfoMemoryUsageInfo}
     * @memberof HostinfoInfo
     */
    'memory_usage'?: HostinfoMemoryUsageInfo;
    /**
     * Containing unused partitions. The key is path in lower case. Note: deviceName is not used as the key, since TiDB and TiKV may return different deviceName for the same device.
     * @type {{ [key: string]: HostinfoPartitionInfo; }}
     * @memberof HostinfoInfo
     */
    'partitions'?: { [key: string]: HostinfoPartitionInfo; };
}

