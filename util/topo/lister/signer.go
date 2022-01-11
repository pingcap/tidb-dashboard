// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package lister

import (
	"github.com/pingcap/tidb-dashboard/util/topo"
)

type Signer interface {
	Sign(d topo.ComponentDescriptor) (SignedComponentDescriptor, error)
	Verify(sd SignedComponentDescriptor) (topo.ComponentDescriptor, error)
	BatchVerify(sdList []SignedComponentDescriptor) ([]topo.ComponentDescriptor, error)
}
