module github.com/pingcap/tidb-dashboard

go 1.13

require (
	github.com/DATA-DOG/go-sqlmock v1.5.0
	github.com/Masterminds/semver v1.5.0
	github.com/ReneKroon/ttlcache/v2 v2.3.0
	github.com/VividCortex/mysqlerr v1.0.0
	github.com/Xeoncross/go-aesctr-with-hmac v0.0.0-20200623134604-12b17a7ff502
	github.com/alecthomas/template v0.0.0-20190718012654-fb15b899a751
	github.com/antonmedv/expr v1.9.0
	github.com/breeswish/gin-jwt/v2 v2.6.4-jwt-patch
	github.com/cenkalti/backoff/v4 v4.0.2
	github.com/fatih/structtag v1.2.0
	github.com/gin-contrib/gzip v0.0.1
	github.com/gin-gonic/gin v1.7.4
	github.com/go-resty/resty/v2 v2.6.0
	github.com/go-sql-driver/mysql v1.6.0
	github.com/goccy/go-graphviz v0.0.9
	github.com/golang-jwt/jwt v3.2.1+incompatible
	github.com/golang/protobuf v1.5.2 // indirect
	github.com/golang/snappy v0.0.4
	github.com/google/pprof v0.0.0-20211122183932-1daafda22083
	github.com/google/uuid v1.0.0
	github.com/gtank/cryptopasta v0.0.0-20170601214702-1f550f6f2f69
	github.com/henrylee2cn/ameda v1.4.10
	github.com/jarcoal/httpmock v1.0.8
	github.com/joho/godotenv v1.4.0
	github.com/joomcode/errorx v1.0.1
	github.com/json-iterator/go v1.1.12
	github.com/minio/sio v0.3.0
	github.com/oleiade/reflections v1.0.1
	github.com/pingcap/check v0.0.0-20191216031241-8a5a85928f12
	github.com/pingcap/errors v0.11.5-0.20200917111840-a15ef68f753d
	github.com/pingcap/kvproto v0.0.0-20200411081810-b85805c9476c
	github.com/pingcap/log v0.0.0-20210906054005-afc726e70354
	github.com/pingcap/tipb v0.0.0-20220314125451-bfb5c2c55188
	github.com/rs/cors v1.7.0
	github.com/shhdgit/testfixtures/v3 v3.6.2-0.20211219171712-c4f264d673d3
	github.com/shurcooL/httpgzip v0.0.0-20190720172056-320755c1c1b0
	github.com/spf13/pflag v1.0.5
	github.com/stretchr/testify v1.7.0
	github.com/swaggo/http-swagger v0.0.0-20200308142732-58ac5e232fba
	github.com/swaggo/swag v1.6.6-0.20200529100950-7c765ddd0476
	github.com/thoas/go-funk v0.8.0
	github.com/vmihailenco/msgpack/v5 v5.3.5
	go.etcd.io/etcd v0.0.0-20191023171146-3cf2f69b5738
	go.uber.org/atomic v1.9.0
	go.uber.org/fx v1.12.0
	go.uber.org/goleak v1.1.10
	go.uber.org/zap v1.19.0
	golang.org/x/oauth2 v0.0.0-20180821212333-d2e6202438be
	golang.org/x/sync v0.0.0-20210220032951-036812b2e83c
	google.golang.org/grpc v1.25.1
	google.golang.org/protobuf v1.28.0 // indirect
	gorm.io/driver/mysql v1.0.6
	gorm.io/driver/sqlite v1.1.4
	gorm.io/gorm v1.21.9
	moul.io/zapgorm2 v1.1.0
)

replace github.com/pingcap/tipb => github.com/time-and-fate/tipb v0.0.0-20220620062228-0abb96df1346
