// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

// Copyright (c) 2012-2020 Mat Ryer, Tyler Bunnell and contributors.

package assertutil

import "fmt"

type mockTestingT struct {
	errorFmt string
	args     []interface{}
}

func (m *mockTestingT) errorString() string {
	return fmt.Sprintf(m.errorFmt, m.args...)
}

func (m *mockTestingT) Errorf(format string, args ...interface{}) {
	m.errorFmt = format
	m.args = args
}
