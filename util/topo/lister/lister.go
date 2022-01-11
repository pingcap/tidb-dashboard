// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package lister

import (
	"context"

	"github.com/pingcap/tidb-dashboard/util/topo"
)

// ComponentLister produces a trusted list of components that can be used to be verified later.
type ComponentLister interface {
	// List produces a list of component descriptors with signatures.
	// It may be possible that there are both results and errors.
	List(context.Context) ([]SignedComponentDescriptor, error)

	// Verify verifies whether the signature is valid and returns the component descriptor.
	Verify(sd SignedComponentDescriptor) (topo.ComponentDescriptor, error)

	// BatchVerify verifies whether signatures are valid and returns a list of component descriptors.
	BatchVerify(sdList []SignedComponentDescriptor) ([]topo.ComponentDescriptor, error)
}

//go:generate mockery --name ComponentLister --inpackage
var _ ComponentLister = (*MockComponentLister)(nil)
