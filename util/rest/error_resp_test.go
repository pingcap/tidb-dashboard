// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package rest

import (
	"fmt"
	"os"
	"regexp"
	"strings"
	"testing"

	"github.com/joomcode/errorx"
	"github.com/stretchr/testify/require"
)

func TestErrors(t *testing.T) {
	ns := errorx.NewNamespace("ns")
	errTypeInner := ns.NewType("errInner")
	errTypeOuter := ns.NewType("errOuter")

	tests := []struct {
		err                 error
		expectCode          string
		expectSimpleMessage string
		expectDetailMessage string
	}{
		{
			fmt.Errorf(""),
			"common.internal",
			"",
			"",
		},
		{
			fmt.Errorf("foo"),
			"common.internal",
			"foo",
			"foo",
		},
		{
			os.ErrNotExist,
			"common.internal",
			"file does not exist",
			"file does not exist",
		},
		{
			fmt.Errorf("internal error: %w", os.ErrNotExist),
			"common.internal",
			"internal error: file does not exist",
			"internal error: file does not exist",
		},
		{
			errTypeInner.NewWithNoMessage(),
			"ns.errInner",
			"ns.errInner",
			"ns.errInner",
		},
		{
			errTypeInner.New("foo"),
			"ns.errInner",
			"foo",
			"ns.errInner: foo",
		},
		{
			errTypeOuter.WrapWithNoMessage(os.ErrNotExist),
			"ns.errOuter",
			"file does not exist",
			"ns.errOuter: file does not exist",
		},
		{
			errTypeOuter.Wrap(os.ErrNotExist, "internal error"),
			"ns.errOuter",
			"internal error, caused by: file does not exist",
			"ns.errOuter: internal error, cause: file does not exist",
		},
		{
			errTypeOuter.WrapWithNoMessage(errTypeInner.NewWithNoMessage()),
			"ns.errOuter",
			"ns.errOuter: ns.errInner",
			"ns.errOuter: ns.errInner",
		},
		{
			errTypeOuter.WrapWithNoMessage(errTypeInner.New("foo")),
			"ns.errOuter",
			"foo",
			"ns.errOuter: ns.errInner: foo",
		},
		{
			errTypeOuter.WrapWithNoMessage(errTypeInner.WrapWithNoMessage(os.ErrNotExist)),
			"ns.errOuter",
			"file does not exist",
			"ns.errOuter: ns.errInner: file does not exist",
		},
		{
			errTypeOuter.WrapWithNoMessage(errTypeInner.WrapWithNoMessage(fmt.Errorf(""))),
			"ns.errOuter",
			"ns.errOuter: ns.errInner",
			"ns.errOuter: ns.errInner",
		},
		{
			errTypeOuter.WrapWithNoMessage(errTypeInner.Wrap(os.ErrNotExist, "internal error")),
			"ns.errOuter",
			"internal error, caused by: file does not exist",
			"ns.errOuter: ns.errInner: internal error, cause: file does not exist",
		},
		{
			errTypeOuter.Wrap(errTypeInner.NewWithNoMessage(), "gateway error"),
			"ns.errOuter",
			"gateway error",
			"ns.errOuter: gateway error, cause: ns.errInner",
		},
		{
			errTypeOuter.Wrap(errTypeInner.New("foo"), "gateway error"),
			"ns.errOuter",
			"gateway error, caused by: foo",
			"ns.errOuter: gateway error, cause: ns.errInner: foo",
		},
		{
			errTypeOuter.Wrap(errTypeInner.WrapWithNoMessage(os.ErrNotExist), "gateway error"),
			"ns.errOuter",
			"gateway error, caused by: file does not exist",
			"ns.errOuter: gateway error, cause: ns.errInner: file does not exist",
		},
		{
			errTypeOuter.Wrap(errTypeInner.Wrap(os.ErrNotExist, "internal error"), "gateway error"),
			"ns.errOuter",
			"gateway error, caused by: internal error, caused by: file does not exist",
			"ns.errOuter: gateway error, cause: ns.errInner: internal error, cause: file does not exist",
		},
		{
			errorx.Decorate(errorx.IllegalState.New("unfortunate"), "this could be so much better"),
			"common.illegal_state",
			"this could be so much better, caused by: unfortunate",
			"this could be so much better, cause: common.illegal_state: unfortunate",
		},
		{
			errorx.Decorate(os.ErrNotExist, "this could be so much better"),
			"common.internal",
			"this could be so much better, caused by: file does not exist",
			"this could be so much better, cause: file does not exist",
		},
	}

	for idx, tt := range tests {
		t.Run(fmt.Sprintf("Case #%d", idx), func(t *testing.T) {
			require.Equal(t, tt.expectSimpleMessage, buildSimpleMessage(tt.err))
			require.Equal(t, tt.expectCode, buildCode(tt.err))
			requireErrorAndStack(t, buildDetailMessage(tt.err), tt.expectDetailMessage)
		})
	}

	require.Equal(t, "", buildSimpleMessage(nil))
	require.Equal(t, "", buildCode(nil))
	require.Equal(t, "", buildDetailMessage(nil))
}

func requireErrorAndStack(t *testing.T, src string, errMessage string) {
	lines := strings.SplitN(src, "\n", 2)
	require.Equal(t, 2, len(lines))
	require.Equal(t, errMessage, lines[0])
	require.NotEmpty(t, lines[1])

	stacks := strings.Split(lines[1], "\n")
	require.GreaterOrEqual(t, len(stacks), 2)
	require.True(t, regexp.MustCompile(`^\s*at github\.com/.*?\(\)`).MatchString(stacks[0]))
	require.True(t, regexp.MustCompile(`\.go:\d+$`).MatchString(stacks[1]))
}
