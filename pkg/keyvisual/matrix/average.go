// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package matrix

// AverageSplitStrategy adopts the strategy of equal distribution when buckets are split.
func AverageSplitStrategy() SplitStrategy {
	return averageSplitStrategy{}
}

type averageSplitStrategy struct{}

type averageSplitter struct{}

func (averageSplitStrategy) NewSplitter(_ []chunk, _ []string) Splitter {
	return averageSplitter{}
}

func (averageSplitter) Split(dst, src chunk, tag splitTag, _ int) {
	CheckPartOf(dst.Keys, src.Keys)

	if len(dst.Keys) == len(src.Keys) {
		switch tag {
		case splitTo:
			copy(dst.Values, src.Values)
		case splitAdd:
			for i, v := range src.Values {
				dst.Values[i] += v
			}
		default:
			panic("unreachable")
		}
		return
	}

	start := 0
	for startKey := src.Keys[0]; !equal(dst.Keys[start], startKey); {
		start++
	}
	end := start + 1

	switch tag {
	case splitTo:
		for i, key := range src.Keys[1:] {
			for !equal(dst.Keys[end], key) {
				end++
			}
			value := src.Values[i] / uint64(end-start)
			for ; start < end; start++ {
				dst.Values[start] = value
			}
			end++
		}
	case splitAdd:
		for i, key := range src.Keys[1:] {
			for !equal(dst.Keys[end], key) {
				end++
			}
			value := src.Values[i] / uint64(end-start)
			for ; start < end; start++ {
				dst.Values[start] += value
			}
			end++
		}
	default:
		panic("unreachable")
	}
}
