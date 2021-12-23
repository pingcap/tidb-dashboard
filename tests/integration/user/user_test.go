// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package user

import (
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/joomcode/errorx"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap/tidb-dashboard/util/featureflag"
	"github.com/pingcap/tidb-dashboard/util/rest"
	"github.com/pingcap/tidb-dashboard/util/testutil"
	"github.com/stretchr/testify/suite"
)

type testUserSuite struct {
	suite.Suite
	db *testutil.TestDB
}

func TestUserSuite(t *testing.T) {
	db := testutil.OpenTestDB(t)

	suite.Run(t, &testUserSuite{
		db: db,
	})
}

func (s *testUserSuite) SetupSuite() {
}

func (s *testUserSuite) TearDownSuite() {
}

func (s *testUserSuite) TestLogin() {
	router := gin.Default()
	routerGroup := router.Group("/dashboard/api")
	featureFlagRegister := featureflag.NewRegistry(os.Getenv("TIDB_VERSION"))
	authService := user.NewAuthService(featureFlagRegister)

	handled := false
	routerGroup.Use(func(c *gin.Context) {
		c.Next()

		handled = true
		s.Require().True(errorx.IsOfType(c.Errors.Last().Err, rest.ErrBadRequest))
	})
	user.RegisterRouter(routerGroup, authService)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/dashboard/api/user/login", nil)
	router.ServeHTTP(w, req)

	s.Require().Equal(http.StatusUnauthorized, w.Code)
	s.Require().True(handled)
	s.Require().Contains("invalid request", w.Body.String())
}
