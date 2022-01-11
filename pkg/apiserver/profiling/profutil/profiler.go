// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package profutil

import (
	"context"
	"fmt"
	"io"

	"github.com/pingcap/tidb-dashboard/util/client/httpclient"
	"github.com/pingcap/tidb-dashboard/util/topo"
)

type ProfKind string

const (
	ProfKindCPU       ProfKind = "cpu"
	ProfKindHeap      ProfKind = "heap"
	ProfKindGoroutine ProfKind = "goroutine"
	ProfKindMutex     ProfKind = "mutex"
)

type ProfDataType string

const (
	ProfDataTypeUnknown  ProfDataType = "unknown"
	ProfDataTypeProtobuf ProfDataType = "protobuf"
	ProfDataTypeText     ProfDataType = "text"
)

func (dataType ProfDataType) Extension() string {
	switch dataType {
	case ProfDataTypeProtobuf:
		return ".proto"
	case ProfDataTypeText:
		return ".txt"
	default:
		return ".bin"
	}
}

type Config struct {
	Context       context.Context
	ProfilingKind ProfKind
	// Note: The configured default base URL of the client will be discarded and
	// always overridden by the host and port specified by the Target.
	Client *httpclient.Client
	Target topo.ComponentDescriptor

	DurationSec uint
}

var profilers = map[ProfKind]profiler{
	ProfKindCPU:       profilerCPU{},
	ProfKindHeap:      profilerHeap{},
	ProfKindGoroutine: profilerGoroutine{},
	ProfKindMutex:     profilerMutex{},
}

func IsProfKindValid(pk ProfKind) bool {
	_, ok := profilers[pk]
	return ok
}

func IsProfSupported(config Config) bool {
	p, ok := profilers[config.ProfilingKind]
	if !ok {
		return false
	}
	if !p.isSupported(config.Target.Kind) {
		return false
	}
	return true
}

func FetchProfile(config Config, w io.Writer) (ProfDataType, error) {
	if !IsProfSupported(config) {
		return ProfDataTypeUnknown, fmt.Errorf("profiling kind %s is not supported", config.ProfilingKind)
	}
	return profilers[config.ProfilingKind].fetch(config, w)
}

func resolvePProfAPI(cd topo.ComponentDescriptor) (host string, port uint, err error) {
	switch cd.Kind {
	case topo.KindTiDB:
		return cd.IP, cd.StatusPort, nil
	case topo.KindPD:
		return cd.IP, cd.Port, nil
	case topo.KindTiKV:
		return cd.IP, cd.StatusPort, nil
	case topo.KindTiFlash:
		return cd.IP, cd.StatusPort, nil
	default:
		return "", 0, fmt.Errorf("component kind %s is not supported", cd.Kind)
	}
}

type profiler interface {
	isSupported(k topo.ComponentKind) bool
	fetch(config Config, w io.Writer) (resultType ProfDataType, err error)
}

type profilerCPU struct{}

var _ profiler = profilerCPU{}

func (_ profilerCPU) isSupported(k topo.ComponentKind) bool {
	return k == topo.KindTiDB || k == topo.KindPD || k == topo.KindTiKV || k == topo.KindTiFlash
}

func (p profilerCPU) fetch(config Config, w io.Writer) (resultType ProfDataType, err error) {
	resultType = ProfDataTypeProtobuf
	ip, port, e := resolvePProfAPI(config.Target)
	if e != nil {
		err = e
		return
	}
	if config.DurationSec == 0 {
		config.DurationSec = 10
	}
	if config.DurationSec > 5*60 {
		config.DurationSec = 5 * 60
	}
	_, _, err = config.Client.LR().
		SetContext(config.Context).
		SetTLSAwareBaseURL(fmt.Sprintf("http://%s:%d", ip, port)).
		SetQueryParam("seconds", fmt.Sprintf("%d", config.DurationSec)).
		Get("/debug/pprof/profile").
		PipeBody(w)
	return
}

type profilerHeap struct{}

var _ profiler = profilerHeap{}

func (_ profilerHeap) isSupported(k topo.ComponentKind) bool {
	return k == topo.KindTiDB || k == topo.KindPD
}

func (p profilerHeap) fetch(config Config, w io.Writer) (resultType ProfDataType, err error) {
	resultType = ProfDataTypeProtobuf
	ip, port, e := resolvePProfAPI(config.Target)
	if e != nil {
		err = e
		return
	}
	_, _, err = config.Client.LR().
		SetContext(config.Context).
		SetTLSAwareBaseURL(fmt.Sprintf("http://%s:%d", ip, port)).
		Get("/debug/pprof/heap").
		PipeBody(w)
	return
}

type profilerGoroutine struct{}

var _ profiler = profilerGoroutine{}

func (_ profilerGoroutine) isSupported(k topo.ComponentKind) bool {
	return k == topo.KindTiDB || k == topo.KindPD
}

func (p profilerGoroutine) fetch(config Config, w io.Writer) (resultType ProfDataType, err error) {
	resultType = ProfDataTypeText
	ip, port, e := resolvePProfAPI(config.Target)
	if e != nil {
		err = e
		return
	}
	_, _, err = config.Client.LR().
		SetContext(config.Context).
		SetTLSAwareBaseURL(fmt.Sprintf("http://%s:%d", ip, port)).
		Get("/debug/pprof/goroutine?debug=1").
		PipeBody(w)
	return
}

type profilerMutex struct{}

var _ profiler = profilerMutex{}

func (_ profilerMutex) isSupported(k topo.ComponentKind) bool {
	return k == topo.KindTiDB || k == topo.KindPD
}

func (p profilerMutex) fetch(config Config, w io.Writer) (resultType ProfDataType, err error) {
	resultType = ProfDataTypeText
	ip, port, e := resolvePProfAPI(config.Target)
	if e != nil {
		err = e
		return
	}
	_, _, err = config.Client.LR().
		SetContext(config.Context).
		SetTLSAwareBaseURL(fmt.Sprintf("http://%s:%d", ip, port)).
		Get("/debug/pprof/mutex?debug=1").
		PipeBody(w)
	return
}
