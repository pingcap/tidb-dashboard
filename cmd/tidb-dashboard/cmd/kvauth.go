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

var kvAuthCmd = &cobra.Command{
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

		client, err := pd.NewEtcdClientNoLC(cfg.CoreConfig)
		if err != nil {
			fmt.Println("Failed to create etcdClient")
			os.Exit(1)
		}

		if err := globalUtil.VerifyKvAuthKey(client, kvAuthKey); err != nil {
			fmt.Println("Test auth failed: " + err.Error())
			os.Exit(1)
		} else {
			fmt.Println("Test auth success")
			os.Exit(0)
		}

	},
}

var kvAuthKey string
var isHiddenVerify bool

func init() {
	rootCmd.AddCommand(kvAuthCmd)
	kvAuthCmd.Flags().StringVarP(&kvAuthKey, "key", "k", "", "auth key")
	kvAuthCmd.Flags().BoolVar(&isHiddenVerify, "hidden-test-auth", false, "do auth")
	_ = kvAuthCmd.Flags().MarkHidden("hidden-test-auth")
}
