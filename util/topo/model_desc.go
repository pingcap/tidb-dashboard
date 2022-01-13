// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package topo

import (
	"database/sql"
	"database/sql/driver"
	"fmt"
	"strings"

	"github.com/pingcap/tidb-dashboard/util/jsonserde"
)

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

var (
	_ sql.Scanner   = (*CompDescriptor)(nil)
	_ driver.Valuer = CompDescriptor{}
)

// Scan implements sql.Scanner interface.
func (cd *CompDescriptor) Scan(src interface{}) error {
	return jsonserde.Default.Unmarshal([]byte(src.(string)), cd)
}

// Value implements driver.Valuer interface.
func (cd CompDescriptor) Value() (driver.Value, error) {
	val, err := jsonserde.Default.Marshal(cd)
	return string(val), err
}

func (cd *CompDescriptor) DisplayHost() string {
	return fmt.Sprintf("%s:%d", cd.IP, cd.Port)
}

func (cd *CompDescriptor) FileName() string {
	host := strings.NewReplacer(":", "_", ".", "_").Replace(cd.DisplayHost())
	return fmt.Sprintf("%s_%s", cd.Kind, host)
}

// SignedCompDescriptor is a component descriptor with server-generated signatures. This makes it
// secure to be passed to the user environment and accepted from user input.
// You should always call `Verify()` to verify the signature if it comes from user input.
type SignedCompDescriptor struct {
	CompDescriptor
	Signature string
}

func (desc *SignedCompDescriptor) Verify(signer CompDescriptorSigner) error {
	return signer.Verify(desc)
}

func BatchVerifyCompDesc(signer CompDescriptorSigner, list []SignedCompDescriptor) ([]CompDescriptor, error) {
	descList := make([]CompDescriptor, 0, len(list))
	for _, desc := range list {
		err := desc.Verify(signer)
		if err != nil {
			return nil, err
		}
		descList = append(descList, desc.CompDescriptor)
	}
	return descList, nil
}
