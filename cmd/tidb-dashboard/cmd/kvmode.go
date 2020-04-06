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

package cmd

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/pd"
	globalUtil "github.com/pingcap-incubator/tidb-dashboard/pkg/utils"
)

//var cfg = &DashboardCLIConfig{}

var kvModeCmd = &cobra.Command{
	Use:   "kvmode",
	Short: "tikv mode related ops, including reset, clear tikv mode username, password",
	Long:  ``,
	Run: func(cmd *cobra.Command, args []string) {
		if !kvModeDoAuth {
			_ = cmd.Help()
			os.Exit(0)
		}

		if kvModeAuthKey == "" {
			fmt.Println("Can not use empty auth key")
			_ = cmd.Help()
			os.Exit(1)
		}

		client, err := pd.NewEtcdClientNoLC(cfg.CoreConfig)
		if err != nil {
			fmt.Println("Failed to create etcdClient")
			os.Exit(1)
		}

		if err := globalUtil.VerifyKvModeAuthKey(client, kvModeAuthKey); err != nil {
			fmt.Println("Test auth failed: " + err.Error())
			os.Exit(1)
		} else {
			fmt.Println("Test auth success")
			os.Exit(0)
		}

	},
}

var kvModeAuthKey string
var kvModeDoAuth bool

func init() {
	rootCmd.AddCommand(kvModeCmd)
	kvModeCmd.Flags().StringVarP(&kvModeAuthKey, "key", "k", "", "auth key")
	kvModeCmd.Flags().BoolVar(&kvModeDoAuth, "hidden-test-auth", false, "do auth")
	_ = kvModeCmd.Flags().MarkHidden("hidden-test-auth")
}
