// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package region

// StatTag is a tag for statistics of different dimensions.
type StatTag int

const (
	// Integration is The overall value of all other dimension statistics.
	Integration StatTag = iota
	// WrittenBytes is the size of the data written per minute.
	WrittenBytes
	// ReadBytes is the size of the data read per minute.
	ReadBytes
	// WrittenKeys is the number of keys written to the data per minute.
	WrittenKeys
	// ReadKeys is the number of keys read to the data per minute.
	ReadKeys
)

// IntoTag converts a string into a StatTag.
func IntoTag(typ string) StatTag {
	switch typ {
	case "":
		return Integration
	case "integration":
		return Integration
	case "written_bytes":
		return WrittenBytes
	case "read_bytes":
		return ReadBytes
	case "written_keys":
		return WrittenKeys
	case "read_keys":
		return ReadKeys
	default:
		return WrittenBytes
	}
}

func (tag StatTag) String() string {
	switch tag {
	case Integration:
		return "integration"
	case WrittenBytes:
		return "written_bytes"
	case ReadBytes:
		return "read_bytes"
	case WrittenKeys:
		return "written_keys"
	case ReadKeys:
		return "read_keys"
	default:
		panic("unreachable")
	}
}

// StorageTags is the order of tags during storage.
var StorageTags = []StatTag{WrittenBytes, ReadBytes, WrittenKeys, ReadKeys}

// ResponseTags is the order of tags when responding.
var ResponseTags = append([]StatTag{Integration}, StorageTags...)

// GetDisplayTags returns the actual order of the ResponseTags under the specified baseTag.
func GetDisplayTags(baseTag StatTag) []string {
	displayTags := make([]string, len(ResponseTags))
	for i, tag := range ResponseTags {
		displayTags[i] = tag.String()
		if tag == baseTag {
			displayTags[0], displayTags[i] = displayTags[i], displayTags[0]
		}
	}
	return displayTags
}
