// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package user

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/joomcode/errorx"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap/tidb-dashboard/tests/util"
	"github.com/pingcap/tidb-dashboard/util/featureflag"
	"github.com/pingcap/tidb-dashboard/util/rest"
	"github.com/pingcap/tidb-dashboard/util/testutil"
	"github.com/stretchr/testify/suite"
)

type testUserSuite struct {
	suite.Suite
	db          *testutil.TestDB
	tidbVersion string
}

func TestUserSuite(t *testing.T) {
	db := testutil.OpenTestDB(t)

	suite.Run(t, &testUserSuite{
		db:          db,
		tidbVersion: util.GetTiDBVersion(t, db),
	})
}

func (s *testUserSuite) SetupSuite() {
	// create user
}

func (s *testUserSuite) TearDownSuite() {
}

func (s *testUserSuite) TestLogin() {
	featureFlagRegister := featureflag.NewRegistry(s.tidbVersion)
	authService := user.NewAuthService(featureFlagRegister)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest(http.MethodPost, "/user/login", nil)
	// when this case fails, it only updates context status and err, doesn't update and send response
	authService.LoginHandler(c)

	s.Require().True(errorx.IsOfType(c.Errors.Last().Err, rest.ErrBadRequest))
	s.Require().Equal(401, c.Writer.Status())
	s.Require().Equal(200, w.Code)
}
