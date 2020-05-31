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
	"bufio"
	"fmt"
	"os"
	"syscall"

	"github.com/spf13/cobra"
	"go.etcd.io/etcd/clientv3"
	"go.uber.org/fx"
	"golang.org/x/crypto/ssh/terminal"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/pd"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/utils"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/utils/kvauth"
)

func provideCfg() *config.Config {
	return cfg.CoreConfig
}

func runFx(cmdRun func(client *clientv3.Client)) {
	fx.New(
		fx.Logger(utils.NewFxPrinter()),
		fx.Provide(provideCfg),
		fx.Provide(pd.NewEtcdClient),
		fx.Invoke(cmdRun),
	)
}

var kvAuthCmd = &cobra.Command{
	Use:   "kvauth",
	Short: "kvauth related ops, including reset, revoke kvauth username password",
	Long:  ``,
	Run: func(cmd *cobra.Command, args []string) {
		_ = cmd.Help()
		os.Exit(0)
	},
}

var kvAuthResetCmd = &cobra.Command{
	Use:   "reset",
	Short: "set or reset kvauth username password",
	Long:  ``,
	Run: func(cmd *cobra.Command, args []string) {
		runFx(func(client *clientv3.Client) {

			reader := bufio.NewReader(os.Stdin)

			var kvAuthUsername string
			var kvAuthPassword string
			var rawPass []byte

			fmt.Print("username: ")
			kvAuthUsername, err := reader.ReadString('\n')
			if err != nil {
				panic(err)
			}

			fmt.Print("password: ")
			rawPass, err = terminal.ReadPassword(int(syscall.Stdin))
			if err != nil {
				panic(err)
			}
			kvAuthPassword = string(rawPass)
			fmt.Print("\n")

			if kvAuthUsername == "" || kvAuthPassword == "" {
				_ = cmd.Help()
				os.Exit(0)
			}

			if kvauth.ResetKvAuthAccount(client, kvAuthUsername, kvAuthPassword) != nil {
				fmt.Println("Failed to reset kvauth")
				os.Exit(1)
			}
			fmt.Println("reset success")
		})
	},
}

var kvAuthRevokeCmd = &cobra.Command{
	Use:   "revoke",
	Short: "revoke kvauth account",
	Long:  ``,
	Run: func(cmd *cobra.Command, args []string) {
		runFx(func(client *clientv3.Client) {
			if kvauth.RevokeKvAuthAccount(client) != nil {
				fmt.Println("Failed to clear kv mode auth secret key")
				os.Exit(1)
			}
			fmt.Println("revoke success")
		})
	},
}
