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
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/info"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap/tidb-dashboard/pkg/apiserver/user/sqlauth"
	"github.com/pingcap/tidb-dashboard/pkg/config"
	"github.com/pingcap/tidb-dashboard/pkg/dbstore"
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
	infoService *info.Service
}

func TestUserSuite(t *testing.T) {
	db := testutil.OpenTestDB(t)
	tidbVersion := util.GetTiDBVersion(t, db)

	authService := &user.AuthService{}
	infoService := &info.Service{}

	app := fx.New(
		fx.Supply(featureflag.NewRegistry(tidbVersion)),
		fx.Supply(config.Default()),
		fx.Provide(
			httpc.NewHTTPClient,
			pd.NewEtcdClient,
			tidb.NewTiDBClient,
			user.NewAuthService,
			dbstore.NewDBStore,
			info.NewService,
		),
		sqlauth.Module,
		fx.Populate(&authService),
		fx.Populate(&infoService),
	)
	ctx := context.Background()
	app.Start(ctx)

	suite.Run(t, &testUserSuite{
		db:          db,
		authService: authService,
		infoService: infoService,
	})

	app.Stop(ctx)
}

func (s *testUserSuite) supportNonRootLogin() bool {
	return s.authService.FeatureFlagNonRootLogin.IsSupported()
}

func genReq(method, uri string, param map[string]interface{}) (*gin.Context, *httptest.ResponseRecorder) {
	var jsonByte []byte = nil
	if param != nil {
		jsonByte, _ = json.Marshal(param)
	}

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest(method, uri, bytes.NewReader(jsonByte))
	return c, w
}

func (s *testUserSuite) SetupSuite() {
	// drop user if exist
	s.db.MustExec("DROP USER IF EXISTS 'dashboardAdmin'@'%'")
	s.db.MustExec("DROP USER IF EXISTS 'dashboardAdmin-2'@'%'")

	// create user 1 with sufficient priviledges
	s.db.MustExec("CREATE USER 'dashboardAdmin'@'%' IDENTIFIED BY '12345678'")
	s.db.MustExec("GRANT PROCESS, CONFIG ON *.* TO 'dashboardAdmin'@'%'")
	s.db.MustExec("GRANT SHOW DATABASES ON *.* TO 'dashboardAdmin'@'%'")
	if s.supportNonRootLogin() {
		s.db.MustExec("GRANT DASHBOARD_CLIENT ON *.* TO 'dashboardAdmin'@'%'")
	}

	// create user 2 with insufficient priviledges
	s.db.MustExec("CREATE USER 'dashboardAdmin-2'@'%' IDENTIFIED BY '12345678'")
	s.db.MustExec("GRANT PROCESS, CONFIG ON *.* TO 'dashboardAdmin-2'@'%'")
	s.db.MustExec("GRANT SHOW DATABASES ON *.* TO 'dashboardAdmin-2'@'%'")
}

func (s *testUserSuite) TearDownSuite() {
	s.db.MustExec("DROP USER IF EXISTS 'dashboardAdmin'@'%'")
	s.db.MustExec("DROP USER IF EXISTS 'dashboardAdmin-2'@'%'")
}

func (s *testUserSuite) TestLoginWithEmpty() {
	c, w := genReq(http.MethodPost, "/user/login", nil)

	// when this case fails, it only updates context status and err, doesn't update and send response
	s.authService.LoginHandler(c)

	s.Require().True(errorx.IsOfType(c.Errors.Last().Err, rest.ErrBadRequest))
	s.Require().Equal(401, c.Writer.Status())
	s.Require().Equal(200, w.Code)
}

func (s *testUserSuite) TestLoginWithNotExistUser() {
	param := make(map[string]interface{})
	param["type"] = 0
	param["username"] = "not_exist"
	param["password"] = "aaa"
	c, w := genReq(http.MethodPost, "/user/login", param)

	// when this case fails, it only updates context status and err, doesn't update and send response
	s.authService.LoginHandler(c)

	s.Require().Contains(c.Errors.Last().Err.Error(), "authenticate failed")
	s.Require().True(errorx.IsOfType(c.Errors.Last().Err, tidb.ErrTiDBAuthFailed))
	s.Require().Equal(401, c.Writer.Status())
	s.Require().Equal(200, w.Code)
}

func (s *testUserSuite) TestLoginWithWrongPassword() {
	param := make(map[string]interface{})
	param["type"] = 0
	param["username"] = "dashboardAdmin"
	param["password"] = "123456789"
	c, w := genReq(http.MethodPost, "/user/login", param)

	// when this case fails, it only updates context status and err, doesn't update and send response
	s.authService.LoginHandler(c)

	s.Require().Contains(c.Errors.Last().Err.Error(), "authenticate failed")
	s.Require().True(errorx.IsOfType(c.Errors.Last().Err, tidb.ErrTiDBAuthFailed))
	s.Require().Equal(401, c.Writer.Status())
	s.Require().Equal(200, w.Code)
}

func (s *testUserSuite) TestLoginWithInsufficientPrivs() {
	param := make(map[string]interface{})
	param["type"] = 0
	param["username"] = "dashboardAdmin-2"
	param["password"] = "12345678"
	c, w := genReq(http.MethodPost, "/user/login", param)

	// when this case fails, it only updates context status and err, doesn't update and send response
	s.authService.LoginHandler(c)

	s.Require().Contains(c.Errors.Last().Err.Error(), "authenticate failed")
	s.Require().True(errorx.IsOfType(c.Errors.Last().Err, user.ErrInsufficientPrivs))
	s.Require().Equal(401, c.Writer.Status())
	s.Require().Equal(200, w.Code)
}

func (s *testUserSuite) TestLoginWithSufficientPrivs() {
	if s.supportNonRootLogin() {
		param := make(map[string]interface{})
		param["type"] = 0
		param["username"] = "dashboardAdmin"
		param["password"] = "12345678"
		c, w := genReq(http.MethodPost, "/user/login", param)

		s.authService.LoginHandler(c)

		s.Require().Len(c.Errors, 0)
		s.Require().Equal(200, c.Writer.Status())
		s.Require().Equal(200, w.Code)

		res := struct {
			Token string
		}{}
		err := json.Unmarshal(w.Body.Bytes(), &res)
		s.Require().Nil(err)

		// request /whoami by the token
		c2, w2 := genReq(http.MethodGet, "/info/whoami", nil)
		c2.Request.Header.Add("Authorization", "Bearer "+res.Token)
		s.authService.MWAuthRequired()(c2)
		s.infoService.WhoamiHandler(c2)

		s.Require().Equal(200, w2.Code)

		res2 := info.WhoAmIResponse{}
		err2 := json.Unmarshal(w2.Body.Bytes(), &res2)
		s.Require().Nil(err2)
		s.Require().Equal(res2.DisplayName, "dashboardAdmin")
	}
}
