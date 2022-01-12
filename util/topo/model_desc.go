// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package topo

import (
	"database/sql"
	"database/sql/driver"
	"fmt"
	"strings"

	"github.com/pingcap/tidb-dashboard/util/jsonserde"
)

// CompDesc (Component Descriptor) is a unique identifier for a component.
// It is secure to be persisted, but is not secure to be accepted from the user input.
// To securely accept a Comp from user input, see SignedCompDesc.
type CompDesc struct {
	IP         string
	Port       uint
	StatusPort uint
	Kind       Kind
	// WARN: Extreme care should be taken when adding more fields here,
	// as this struct is widely used or persisted.
}

var (
	_ sql.Scanner   = (*CompDesc)(nil)
	_ driver.Valuer = CompDesc{}
)

// Scan implements sql.Scanner interface.
func (cd *CompDesc) Scan(src interface{}) error {
	return jsonserde.Default.Unmarshal([]byte(src.(string)), cd)
}

// Value implements driver.Valuer interface.
func (cd CompDesc) Value() (driver.Value, error) {
	val, err := jsonserde.Default.Marshal(cd)
	return string(val), err
}

func (cd *CompDesc) DisplayHost() string {
	return fmt.Sprintf("%s:%d", cd.IP, cd.Port)
}

func (cd *CompDesc) FileName() string {
	host := strings.NewReplacer(":", "_", ".", "_").Replace(cd.DisplayHost())
	return fmt.Sprintf("%s_%s", cd.Kind, host)
}

// SignedCompDesc is a component descriptor with server-generated signatures. This makes it
// secure to be passed to the user environment and accepted from user input.
// You should always call `Verify()` to verify the signature if it comes from user input.
type SignedCompDesc struct {
	CompDesc
	Signature string
}

func (desc *SignedCompDesc) Verify(signer CompDescSigner) error {
	return signer.Verify(desc)
}

func BatchVerifyCompDesc(signer CompDescSigner, list []SignedCompDesc) ([]CompDesc, error) {
	descList := make([]CompDesc, 0, len(list))
	for _, desc := range list {
		err := desc.Verify(signer)
		if err != nil {
			return nil, err
		}
		descList = append(descList, desc.CompDesc)
	}
	return descList, nil
}
