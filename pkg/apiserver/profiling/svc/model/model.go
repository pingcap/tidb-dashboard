// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package model

import (
	"fmt"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/profiling/profutil"
	"github.com/pingcap/tidb-dashboard/util/topo"
)

//go:generate stringer -type=Operation
type Operation int

const (
	OpListTargets Operation = iota
	OpStartBundle
	OpListBundles
	OpGetBundle
	OpGetProfileData
	OpGetBundleData
)

type Backend interface {
	// AuthFn authenticates the request.
	AuthFn(...Operation) []gin.HandlerFunc

	// ListTargets returns all available profiling target components.
	ListTargets() (ListTargetsResp, error)

	// StartBundle starts a new profiling bundle.
	// The backend must verify whether the signed component descriptor is valid.
	StartBundle(StartBundleReq) (StartBundleResp, error)

	// ListBundles returns all profiling bundles ordered by creation time in descending order.
	ListBundles() (ListBundlesResp, error)

	// GetBundle returns the profiling bundle and all of its profiles. The profiles may be in arbitrary order.
	GetBundle(GetBundleReq) (GetBundleResp, error)

	// GetProfileData returns the profile data.
	GetProfileData(GetProfileDataReq) (GetProfileDataResp, error)

	// GetBundleData returns the data of all profiles in the bundle. The profiles may be in arbitrary order.
	GetBundleData(GetBundleDataReq) (GetBundleDataResp, error)
}

//go:generate mockery --name Backend --inpackage
var _ Backend = (*MockBackend)(nil)

type ListTargetsResp struct {
	Targets []topo.CompInfoWithSignature
}

type StartBundleReq struct {
	DurationSec uint
	Kinds       []profutil.ProfKind
	Targets     []topo.SignedCompDescriptor
}

type StartBundleResp struct {
	BundleID uint
}

type ProfileState string

const (
	ProfileStateError     ProfileState = "error"
	ProfileStateRunning   ProfileState = "running"
	ProfileStateSucceeded ProfileState = "succeeded"
	ProfileStateSkipped   ProfileState = "skipped"
)

type BundleState string

const (
	BundleStateRunning          BundleState = "running"
	BundleStateAllSucceeded     BundleState = "all_succeeded"
	BundleStatePartialSucceeded BundleState = "partial_succeeded"
	BundleStateAllFailed        BundleState = "all_failed"
)

type Bundle struct {
	BundleID     uint
	State        BundleState
	DurationSec  uint
	TargetsCount topo.CompCount
	StartAt      time.Time
	Kinds        []profutil.ProfKind
}

type ListBundlesResp struct {
	Bundles []Bundle
}

type GetBundleReq struct {
	BundleID uint
}

type Profile struct {
	ProfileID uint
	State     ProfileState
	Target    topo.CompDescriptor
	Kind      profutil.ProfKind
	Error     string
	StartAt   time.Time
	Progress  float32
	DataType  profutil.ProfDataType
}

func (p *Profile) FileName() string {
	return fmt.Sprintf("%s_%s_%s", p.Kind, p.Target.FileName(), p.StartAt.UTC().Format("2006_01_02_15_04_05"))
}

type GetBundleResp struct {
	Bundle   Bundle
	Profiles []Profile
}

type ProfileWithData struct {
	Profile
	Data []byte `json:"-"`
}

type GetProfileDataReq struct {
	ProfileID uint
}

type GetProfileDataResp struct {
	Profile ProfileWithData
}

type GetBundleDataReq struct {
	BundleID uint
}

type GetBundleDataResp struct {
	Profiles []ProfileWithData
}
