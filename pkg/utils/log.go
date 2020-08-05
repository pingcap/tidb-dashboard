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

package utils

import (
	"fmt"
	"io"
	"log"

	"github.com/hashicorp/go-hclog"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

type asHCLog struct {
	logger *zap.Logger
	name   string
}

// AsHCLog wraps a Zap Logger into an HCLog Logger.
func AsHCLog(logger *zap.Logger, name string) hclog.Logger {
	return &asHCLog{logger: logger, name: name}
}

func (l *asHCLog) log(level zapcore.Level, msg string, args ...interface{}) {
	if entry := l.logger.WithOptions(zap.AddCallerSkip(2)).Check(level, ""); entry != nil {
		entry.Message = fmt.Sprintf("[%s] %s", l.name, msg)
		fields := make([]zap.Field, 0, len(args)/2)
		for i := 0; i < len(args); i += 2 {
			fields = append(fields, zap.Any(args[i].(string), args[i+1]))
		}
		entry.Write(fields...)
	}
}

func (l *asHCLog) Log(level hclog.Level, msg string, args ...interface{}) {
	var zapLevel zapcore.Level
	switch level {
	case hclog.Info:
		zapLevel = zap.InfoLevel
	case hclog.Warn:
		zapLevel = zap.WarnLevel
	case hclog.Error:
		zapLevel = zap.ErrorLevel
	default:
		zapLevel = zap.DebugLevel
	}
	l.log(zapLevel, msg, args...)
}

func (l *asHCLog) Trace(msg string, args ...interface{}) {
	// zap does not have "TRACE" level, treat it the same as "DEBUG" level.
	l.log(zap.DebugLevel, msg, args...)
}

func (l *asHCLog) Debug(msg string, args ...interface{}) {
	l.log(zap.DebugLevel, msg, args...)
}

func (l *asHCLog) Info(msg string, args ...interface{}) {
	l.log(zap.InfoLevel, msg, args...)
}

func (l *asHCLog) Warn(msg string, args ...interface{}) {
	l.log(zap.WarnLevel, msg, args...)
}

func (l *asHCLog) Error(msg string, args ...interface{}) {
	l.log(zap.ErrorLevel, msg, args...)
}

func (l *asHCLog) IsTrace() bool {
	return l.logger.Core().Enabled(zap.DebugLevel)
}

func (l *asHCLog) IsDebug() bool {
	return l.logger.Core().Enabled(zap.DebugLevel)
}

func (l *asHCLog) IsInfo() bool {
	return l.logger.Core().Enabled(zap.InfoLevel)
}

func (l *asHCLog) IsWarn() bool {
	return l.logger.Core().Enabled(zap.WarnLevel)
}

func (l *asHCLog) IsError() bool {
	return l.logger.Core().Enabled(zap.ErrorLevel)
}

func (l *asHCLog) ImpliedArgs() []interface{} {
	return nil
}

func (l *asHCLog) Name() string {
	return l.name
}

func (l *asHCLog) Named(name string) hclog.Logger {
	return &asHCLog{logger: l.logger, name: l.name + "/" + name}
}

func (l *asHCLog) ResetNamed(name string) hclog.Logger {
	return &asHCLog{logger: l.logger, name: name}
}

// the following are never used in hashicorp/go-plugin, so they are left as panics.

func (*asHCLog) With(...interface{}) hclog.Logger {
	panic("unexpected asHCLog.Logger.With")
}

func (*asHCLog) SetLevel(hclog.Level) {
	panic("unexpected asHCLog.Logger.SetLevel")
}

func (*asHCLog) StandardLogger(*hclog.StandardLoggerOptions) *log.Logger {
	panic("unexpected asHCLog.Logger.StandardLogger")
}

func (*asHCLog) StandardWriter(*hclog.StandardLoggerOptions) io.Writer {
	panic("unexpected asHCLog.Logger.StandardWriter")
}
