package rest

import (
	"fmt"
	"os"
	"testing"

	"github.com/joomcode/errorx"
	"github.com/stretchr/testify/require"
)

func TestBuildSimpleMessage(t *testing.T) {
	ns := errorx.NewNamespace("ns")
	errTypeInner := ns.NewType("errInner")
	errTypeOuter := ns.NewType("errOuter")

	require.Equal(t, "", buildSimpleMessage(nil))

	err := fmt.Errorf("")
	require.Equal(t, "", buildSimpleMessage(err))

	err = fmt.Errorf("foo")
	require.Equal(t, "foo", buildSimpleMessage(err))

	err = os.ErrNotExist
	require.Equal(t, "file does not exist", buildSimpleMessage(err))

	err = fmt.Errorf("internal error: %w", os.ErrNotExist)
	require.Equal(t, "internal error: file does not exist", buildSimpleMessage(err))

	err = errTypeInner.NewWithNoMessage()
	require.Equal(t, "ns.errInner", buildSimpleMessage(err))

	err = errTypeInner.New("foo")
	require.Equal(t, "foo", buildSimpleMessage(err))

	err = errTypeOuter.WrapWithNoMessage(os.ErrNotExist)
	require.Equal(t, "file does not exist", buildSimpleMessage(err))

	err = errTypeOuter.Wrap(os.ErrNotExist, "internal error")
	require.Equal(t, "internal error, caused by: file does not exist", buildSimpleMessage(err))

	err = errTypeOuter.WrapWithNoMessage(errTypeInner.NewWithNoMessage())
	require.Equal(t, "ns.errOuter: ns.errInner", buildSimpleMessage(err))

	err = errTypeOuter.WrapWithNoMessage(errTypeInner.New("foo"))
	require.Equal(t, "foo", buildSimpleMessage(err))

	err = errTypeOuter.WrapWithNoMessage(errTypeInner.WrapWithNoMessage(os.ErrNotExist))
	require.Equal(t, "file does not exist", buildSimpleMessage(err))

	err = errTypeOuter.WrapWithNoMessage(errTypeInner.WrapWithNoMessage(fmt.Errorf("")))
	require.Equal(t, "ns.errOuter: ns.errInner", buildSimpleMessage(err))

	err = errTypeOuter.WrapWithNoMessage(errTypeInner.Wrap(os.ErrNotExist, "internal error"))
	require.Equal(t, "internal error, caused by: file does not exist", buildSimpleMessage(err))

	err = errTypeOuter.Wrap(errTypeInner.NewWithNoMessage(), "gateway error")
	require.Equal(t, "gateway error", buildSimpleMessage(err))

	err = errTypeOuter.Wrap(errTypeInner.New("foo"), "gateway error")
	require.Equal(t, "gateway error, caused by: foo", buildSimpleMessage(err))

	err = errTypeOuter.Wrap(errTypeInner.WrapWithNoMessage(os.ErrNotExist), "gateway error")
	require.Equal(t, "gateway error, caused by: file does not exist", buildSimpleMessage(err))

	err = errTypeOuter.Wrap(errTypeInner.Wrap(os.ErrNotExist, "internal error"), "gateway error")
	require.Equal(t, "gateway error, caused by: internal error, caused by: file does not exist", buildSimpleMessage(err))

	err = errorx.Decorate(errorx.IllegalState.New("unfortunate"), "this could be so much better")
	require.Equal(t, "this could be so much better, caused by: unfortunate", buildSimpleMessage(err))

	err = errorx.Decorate(os.ErrNotExist, "this could be so much better")
	require.Equal(t, "this could be so much better, caused by: file does not exist", buildSimpleMessage(err))
}

func TestBuildCode(t *testing.T) {
	ns := errorx.NewNamespace("ns")
	errTypeInner := ns.NewType("errInner")
	errTypeOuter := ns.NewType("errOuter")

	err := fmt.Errorf("foo")
	require.Equal(t, "common.internal", buildCode(err))

	err = os.ErrNotExist
	require.Equal(t, "common.internal", buildCode(err))

	err = errTypeInner.NewWithNoMessage()
	require.Equal(t, "ns.errInner", buildCode(err))

	err = errTypeInner.New("foo")
	require.Equal(t, "ns.errInner", buildCode(err))

	err = errTypeInner.WrapWithNoMessage(os.ErrNotExist)
	require.Equal(t, "ns.errInner", buildCode(err))

	err = errTypeInner.Wrap(os.ErrNotExist, "foo")
	require.Equal(t, "ns.errInner", buildCode(err))

	err = errorx.Decorate(os.ErrNotExist, "this could be so much better")
	require.Equal(t, "common.internal", buildCode(err))

	err = errTypeOuter.Wrap(errTypeInner.NewWithNoMessage(), "foo")
	require.Equal(t, "ns.errOuter", buildCode(err))
}
