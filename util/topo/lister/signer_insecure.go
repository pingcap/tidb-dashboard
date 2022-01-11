// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package lister

import (
	"github.com/pingcap/tidb-dashboard/util/jsonserde"
	"github.com/pingcap/tidb-dashboard/util/topo"
)

// InsecureSigner is a signer that actually don't verify signatures at all.
// The produced signature is ensured to be a valid JSON string.
// This should be only used in tests.
type InsecureSigner struct{}

var _ Signer = &InsecureSigner{}

func (i InsecureSigner) Sign(d topo.ComponentDescriptor) (SignedComponentDescriptor, error) {
	v, err := jsonserde.Default.Marshal(d)
	if err != nil {
		return "", err
	}
	return SignedComponentDescriptor(v), nil
}

func (i InsecureSigner) Verify(sd SignedComponentDescriptor) (topo.ComponentDescriptor, error) {
	var d topo.ComponentDescriptor
	err := jsonserde.Default.Unmarshal([]byte(sd), &d)
	if err != nil {
		return topo.ComponentDescriptor{}, err
	}
	return d, nil
}

func (i InsecureSigner) BatchVerify(sdList []SignedComponentDescriptor) ([]topo.ComponentDescriptor, error) {
	result := make([]topo.ComponentDescriptor, 0, len(sdList))
	for _, sd := range sdList {
		d, err := i.Verify(sd)
		if err != nil {
			return nil, err
		}
		result = append(result, d)
	}
	return result, nil
}
