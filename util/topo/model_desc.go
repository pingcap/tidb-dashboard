// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package topo

// CompDescriptor (Component Desc) is a unique identifier for a component.
// It is secure to be persisted, but is not secure to be accepted from the user input.
// To securely accept a Comp from user input, see SignedCompDescriptor.
type CompDescriptor struct {
	IP         string
	Port       uint
	StatusPort uint
	Kind       Kind
	// WARN: Extreme care should be taken when adding more fields here,
	// as this struct is widely used or persisted.
}
