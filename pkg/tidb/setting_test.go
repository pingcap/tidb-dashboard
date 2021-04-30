// Copyright 2021 PingCAP, Inc.
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

package tidb

import (
	"testing"

	. "github.com/pingcap/check"
)

var _ = Suite(&testSettingSuite{})

type testSettingSuite struct{}

func TestSetting(t *testing.T) {
	CustomVerboseFlag = true
	TestingT(t)
}

const (
	enforcedSettingTest1 EnforcedSetting = 1 << iota
	enforcedSettingTest2
	enforcedSettingTest4
)

func (t *testSettingSuite) Test_EnforcedSetting(c *C) {
	var setting EnforcedSetting = 0
	setting.Add(enforcedSettingTest1)
	setting.Add(enforcedSettingTest2)
	c.Assert(setting, Equals, enforcedSettingTest1|enforcedSettingTest2)
	setting.Add(enforcedSettingTest2)
	c.Assert(setting, Equals, enforcedSettingTest1|enforcedSettingTest2)

	setting.Delete(enforcedSettingTest2)
	c.Assert(setting, Equals, enforcedSettingTest1)

	c.Assert(setting.Has(enforcedSettingTest1), Equals, true)

	setting.Add(enforcedSettingTest2)
	setting.Add(enforcedSettingTest4)
	setting.Clear()
	c.Assert(setting.Has(enforcedSettingTest1), Equals, false)
	c.Assert(setting.Has(enforcedSettingTest2), Equals, false)
	c.Assert(setting.Has(enforcedSettingTest4), Equals, false)
}
