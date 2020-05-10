// Copyright 2020 PingCAP, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// See the License for the specific language governing permissions and
// limitations under the License.

package main

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"

	"github.com/pingcap-incubator/tidb-dashboard/cmd/common"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/pd"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/utils/kvauth"
)

func main() {
	execute()
}

var coreConfig = &config.Config{}

func execute() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}

var rootCmd = &cobra.Command{
	Use:   "kvauth",
	Short: "kvauth related ops, including reset, revoke tikv mode auth key",
	Long:  ``,
	Run: func(cmd *cobra.Command, args []string) {
		if !isHiddenVerify {
			_ = cmd.Help()
			os.Exit(0)
		}

		if kvAuthKey == "" {
			fmt.Println("Can not use empty auth key")
			_ = cmd.Help()
			os.Exit(1)
		}

		client, err := pd.NewEtcdClientNoLC(coreConfig)
		if err != nil {
			fmt.Println("Failed to create etcdClient")
			os.Exit(1)
		}

		if err := kvauth.VerifyKvAuthKey(client, kvAuthKey); err != nil {
			fmt.Println("Test auth failed: " + err.Error())
			os.Exit(1)
		} else {
			fmt.Println("Test auth success")
			os.Exit(0)
		}

	},
}

var kvAuthResetCmd = &cobra.Command{
	Use:   "reset",
	Short: "set or reset kvauth secret key",
	Long:  ``,
	Run: func(cmd *cobra.Command, args []string) {
		if kvAuthKey == "" {
			fmt.Println("Can not set empty auth key")
			_ = cmd.Help()
			os.Exit(1)
		}
		client, err := pd.NewEtcdClientNoLC(coreConfig)
		if err != nil {
			fmt.Println("Failed to create etcdClient")
			os.Exit(1)
		}

		if kvauth.ResetKvAuthKey(client, kvAuthKey) != nil {
			fmt.Println("Failed to reset kv mode auth secret key")
			os.Exit(1)
		}
	},
}

var kvAuthRevokeCmd = &cobra.Command{
	Use:   "revoke",
	Short: "revoke kvauth secret key",
	Long:  ``,
	Run: func(cmd *cobra.Command, args []string) {
		client, err := pd.NewEtcdClientNoLC(coreConfig)
		if err != nil {
			fmt.Println("Failed to create etcdClient")
			os.Exit(1)
		}

		if kvauth.RevokeKvAuthKey(client) != nil {
			fmt.Println("Failed to clear kv mode auth secret key")
			os.Exit(1)
		}
	},
}

var kvAuthKey string
var isHiddenVerify bool

func init() {
	rootCmd.Flags().StringVar(&coreConfig.DataDir, "data-dir", "/tmp/dashboard-data", "Path to the Dashboard Server data directory")
	rootCmd.PersistentFlags().StringVar(&coreConfig.PDEndPoint, "pd", "http://127.0.0.1:2379", "The PD endpoint that Dashboard Server connects to")

	common.SetClusterTLS(rootCmd, coreConfig)
	common.SetPDEndPoint(coreConfig)
	rootCmd.Flags().StringVarP(&kvAuthKey, "key", "k", "", "auth key")
	rootCmd.Flags().BoolVar(&isHiddenVerify, "hidden-test-auth", false, "do auth")
	_ = rootCmd.Flags().MarkHidden("hidden-test-auth")

	rootCmd.AddCommand(kvAuthResetCmd)
	kvAuthResetCmd.Flags().StringVarP(&kvAuthKey, "key", "k", "", "auth key")

	rootCmd.AddCommand(kvAuthRevokeCmd)
}
