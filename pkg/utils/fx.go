// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package utils

import (
	"github.com/pingcap/log"
	"go.uber.org/fx"
)

type FxPrinter func(string, ...any)

func (p FxPrinter) Printf(format string, args ...any) {
	p(format, args...)
}

func NewFxPrinter() fx.Printer {
	return FxPrinter(log.S().Debugf)
}
