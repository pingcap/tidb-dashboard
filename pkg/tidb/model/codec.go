// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package model

import (
	"bytes"
	"encoding/binary"

	"github.com/pingcap/errors"
)

var (
	tablePrefix  = []byte{'t'}
	metaPrefix   = []byte{'m'}
	recordPrefix = []byte{'r'}
)

const (
	signMask uint64 = 0x8000000000000000

	encGroupSize = 8
	encMarker    = byte(0xFF)
	encPad       = byte(0x0)
)

// Key represents high-level TiDB Key type.
type Key []byte

// KeyInfoBuffer can obtain the meta information of the TiDB Key.
// It can be reused, thereby reducing memory applications.
type KeyInfoBuffer []byte

// DecodeKey obtains the KeyInfoBuffer from a TiDB Key.
func (buf *KeyInfoBuffer) DecodeKey(key Key) (KeyInfoBuffer, error) {
	_, result, err := decodeBytes(key, *buf)
	if err != nil {
		*buf = (*buf)[:0]
		return nil, err
	}

	*buf = result
	return result, nil
}

// MetaOrTable checks if the key is a meta key or table key.
// If the key is a meta key, it returns true and 0.
// If the key is a table key, it returns false and table ID.
// Otherwise, it returns false and 0.
func (buf KeyInfoBuffer) MetaOrTable() (isMeta bool, tableID int64) {
	if bytes.HasPrefix(buf, metaPrefix) {
		return true, 0
	}
	if bytes.HasPrefix(buf, tablePrefix) {
		_, tableID, _ := decodeInt(buf[len(tablePrefix):])
		return false, tableID
	}
	return false, 0
}

// RowInfo returns the row ID of the key, if the key is not table key, returns 0.
func (buf KeyInfoBuffer) RowInfo() (isCommonHandle bool, rowID int64) {
	if !bytes.HasPrefix(buf, tablePrefix) || len(buf) < 19 || !(buf[9] == '_' && buf[10] == 'r') {
		return
	}
	isCommonHandle = len(buf) != 19
	if !isCommonHandle {
		_, rowID, _ = decodeInt(buf[11:19])
	}
	return
}

// IndexInfo returns the row ID of the key, if the key is not table key, returns 0.
func (buf KeyInfoBuffer) IndexInfo() (indexID int64) {
	if !bytes.HasPrefix(buf, tablePrefix) || len(buf) < 19 || !(buf[9] == '_' && buf[10] == 'i') {
		return
	}
	_, indexID, _ = decodeInt(buf[11:19])
	return
}

// GenerateTableKey generates a table split key.
func (buf *KeyInfoBuffer) GenerateKey(tableID, rowID int64) Key {
	if tableID == 0 {
		return nil
	}

	data := *buf
	if data == nil {
		length := len(tablePrefix) + 8
		if rowID != 0 {
			length = len(tablePrefix) + len(recordPrefix) + 8*2
		}
		data = make([]byte, 0, length)
	} else {
		data = data[:0]
	}

	data = append(data, tablePrefix...)
	data = encodeInt(data, tableID)
	if rowID != 0 {
		data = append(data, recordPrefix...)
		data = encodeInt(data, rowID)
	}

	*buf = data

	return encodeBytes(data)
}

var pads = make([]byte, encGroupSize)

// decodeBytes decodes bytes which is encoded by encodeBytes before,
// returns the leftover bytes and decoded value if no error.
func decodeBytes(b []byte, buf []byte) (rest []byte, result []byte, err error) {
	if buf == nil {
		buf = make([]byte, 0, len(b))
	}
	buf = buf[:0]

	for {
		if len(b) < encGroupSize+1 {
			return nil, nil, errors.New("insufficient bytes to decode value")
		}

		groupBytes := b[:encGroupSize+1]

		group := groupBytes[:encGroupSize]
		marker := groupBytes[encGroupSize]

		padCount := encMarker - marker
		if padCount > encGroupSize {
			return nil, nil, errors.Errorf("invalid marker byte, group bytes %q", groupBytes)
		}

		realGroupSize := encGroupSize - padCount
		buf = append(buf, group[:realGroupSize]...)
		b = b[encGroupSize+1:]

		if padCount != 0 {
			// Check validity of padding bytes.
			for _, v := range group[realGroupSize:] {
				if v != encPad {
					return nil, nil, errors.Errorf("invalid padding byte, group bytes %q", groupBytes)
				}
			}
			break
		}
	}

	return b, buf, nil
}

// encodeBytes guarantees the encoded value is in ascending order for comparison,
// encoding with the following rule:
//
//	[group1][marker1]...[groupN][markerN]
//	group is 8 bytes slice which is padding with 0.
//	marker is `0xFF - padding 0 count`
//
// For example:
//
//	[] -> [0, 0, 0, 0, 0, 0, 0, 0, 247]
//	[1, 2, 3] -> [1, 2, 3, 0, 0, 0, 0, 0, 250]
//	[1, 2, 3, 0] -> [1, 2, 3, 0, 0, 0, 0, 0, 251]
//	[1, 2, 3, 4, 5, 6, 7, 8] -> [1, 2, 3, 4, 5, 6, 7, 8, 255, 0, 0, 0, 0, 0, 0, 0, 0, 247]
//
// Refer: https://github.com/facebook/mysql-5.6/wiki/MyRocks-record-format#memcomparable-format
func encodeBytes(data []byte) []byte {
	// Allocate more space to avoid unnecessary slice growing.
	// Assume that the byte slice size is about `(len(data) / encGroupSize + 1) * (encGroupSize + 1)` bytes,
	// that is `(len(data) / 8 + 1) * 9` in our implement.
	dLen := len(data)
	result := make([]byte, 0, (dLen/encGroupSize+1)*(encGroupSize+1))
	for idx := 0; idx <= dLen; idx += encGroupSize {
		remain := dLen - idx
		padCount := 0
		if remain >= encGroupSize {
			result = append(result, data[idx:idx+encGroupSize]...)
		} else {
			padCount = encGroupSize - remain
			result = append(result, data[idx:]...)
			result = append(result, pads[:padCount]...)
		}

		marker := encMarker - byte(padCount)
		result = append(result, marker)
	}
	return result
}

// decodeInt decodes value encoded by EncodeInt before.
// It returns the leftover un-decoded slice, decoded value if no error.
func decodeInt(b []byte) ([]byte, int64, error) {
	if len(b) < 8 {
		return nil, 0, errors.New("insufficient bytes to decode value")
	}

	u := binary.BigEndian.Uint64(b[:8])
	v := decodeCmpUintToInt(u)
	b = b[8:]
	return b, v, nil
}

// encodeInt appends the encoded value to slice b and returns the appended slice.
// encodeInt guarantees that the encoded value is in ascending order for comparison.
func encodeInt(b []byte, v int64) []byte {
	var data [8]byte
	u := encodeIntToCmpUint(v)
	binary.BigEndian.PutUint64(data[:], u)
	return append(b, data[:]...)
}

func decodeCmpUintToInt(u uint64) int64 {
	return int64(u ^ signMask)
}

func encodeIntToCmpUint(v int64) uint64 {
	return uint64(v) ^ signMask
}
