// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package code

import (
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/utils"
)

func TestRejectLegacySharingCodes(t *testing.T) {
	s := NewService()
	legacy := &utils.SessionUser{Version: utils.SessionVersion - 1, IsShareable: true, HasTiDBAuth: true}
	code := s.SharingCodeFromSession(legacy, time.Hour, false)
	require.NotNil(t, code)
	require.Nil(t, s.NewSessionFromSharingCode(*code))

	current := &utils.SessionUser{Version: utils.SessionVersion, IsShareable: true, SSOConfigRevision: "current-revision"}
	code = s.SharingCodeFromSession(current, time.Hour, false)
	require.NotNil(t, code)
	session := s.NewSessionFromSharingCode(*code)
	require.NotNil(t, session)
	require.Equal(t, current.SSOConfigRevision, session.SSOConfigRevision)
	require.False(t, session.IsShareable)
}
