package timeutil

import (
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestFormatInUTC(t *testing.T) {
	require.Equal(t, "2021-10-01 16:53:55 UTC", FormatInUTC(time.Unix(1633107235, 0)))
}
