package testutil

import (
	"testing"

	"github.com/gin-gonic/gin"
	"go.uber.org/goleak"
)

func TestMain(m *testing.M) {
	EnableDebugLog()
	gin.SetMode(gin.TestMode)
	goleak.VerifyTestMain(m)
}
