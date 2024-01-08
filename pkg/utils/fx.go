// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package utils

import (
	"github.com/pingcap/log"
	"go.uber.org/fx"
)

type FxPrinter func(string, ...interface{})

func (p FxPrinter) Printf(format string, args ...interface{}) {
	p(format, args...)
}

func NewFxPrinter() fx.Printer {
	return FxPrinter(log.S().Debugf)
}
