// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package user

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/joomcode/errorx"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user/sqlauth"
	"github.com/pingcap/tidb-dashboard/pkg/config"
	"github.com/pingcap/tidb-dashboard/pkg/httpc"
	"github.com/pingcap/tidb-dashboard/pkg/pd"
	"github.com/pingcap/tidb-dashboard/pkg/tidb"
	"github.com/pingcap/tidb-dashboard/tests/util"
	"github.com/pingcap/tidb-dashboard/util/featureflag"
	"github.com/pingcap/tidb-dashboard/util/rest"
	"github.com/pingcap/tidb-dashboard/util/testutil"
	"github.com/stretchr/testify/suite"
	"go.uber.org/fx"
)

type testUserSuite struct {
	suite.Suite
	db          *testutil.TestDB
	authService *user.AuthService
}

func TestUserSuite(t *testing.T) {
	db := testutil.OpenTestDB(t)
	tidbVersion := util.GetTiDBVersion(t, db)

	authService := &user.AuthService{}

	app := fx.New(
		fx.Supply(featureflag.NewRegistry(tidbVersion)),
		fx.Supply(config.Default()),
		fx.Provide(
			httpc.NewHTTPClient,
			pd.NewEtcdClient,
			tidb.NewTiDBClient,
			user.NewAuthService,
		),
		sqlauth.Module,
		fx.Populate(&authService),
	)
	ctx := context.Background()
	app.Start(ctx)

	suite.Run(t, &testUserSuite{
		db:          db,
		authService: authService,
	})

	app.Stop(ctx)
}

func (s *testUserSuite) supportNonRootLogin() bool {
	return s.authService.FeatureFlagNonRootLogin.IsSupported()
}

func (s *testUserSuite) SetupSuite() {
	// drop user if exist
	s.db.MustExec("DROP USER IF EXISTS 'dashboardAdmin'@'%'")
	// create user
	s.db.MustExec("CREATE USER 'dashboardAdmin'@'%' IDENTIFIED BY '12345678'")
	s.db.MustExec("GRANT PROCESS, CONFIG ON *.* TO 'dashboardAdmin'@'%'")
	s.db.MustExec("GRANT SHOW DATABASES ON *.* TO 'dashboardAdmin'@'%'")
	if s.supportNonRootLogin() {
		s.db.MustExec("GRANT DASHBOARD_CLIENT ON *.* TO 'dashboardAdmin'@'%'")
	}
}

func (s *testUserSuite) TearDownSuite() {
	s.db.MustExec("DROP USER IF EXISTS 'dashboardAdmin'@'%'")
}

func (s *testUserSuite) TestLoginWithEmpty() {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest(http.MethodPost, "/user/login", nil)
	// when this case fails, it only updates context status and err, doesn't update and send response
	s.authService.LoginHandler(c)

	s.Require().True(errorx.IsOfType(c.Errors.Last().Err, rest.ErrBadRequest))
	s.Require().Equal(401, c.Writer.Status())
	s.Require().Equal(200, w.Code)
}

func (s *testUserSuite) TestLoginWithNotExistUser() {
	if s.supportNonRootLogin() {
		param := make(map[string]interface{})
		param["type"] = 0
		param["username"] = "not_exist"
		param["password"] = "aaa"
		param["extra"] = "bbb"
		jsonByte, _ := json.Marshal(param)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request, _ = http.NewRequest(http.MethodPost, "/user/login", bytes.NewReader(jsonByte))
		// when this case fails, it only updates context status and err, doesn't update and send response
		s.authService.LoginHandler(c)

		// fmt.Println("err:", c.Errors.Last().Err)
		s.Require().True(errorx.IsOfType(c.Errors.Last().Err, tidb.ErrTiDBAuthFailed))
		s.Require().Contains(c.Errors.Last().Err.Error(), "authenticate failed")
		s.Require().Equal(401, c.Writer.Status())
		s.Require().Equal(200, w.Code)
	}
}
