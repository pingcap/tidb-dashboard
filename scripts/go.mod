module scripts

go 1.13

require (
	github.com/pingcap/log v0.0.0-20210906054005-afc726e70354
	github.com/pingcap/tidb-dashboard v0.0.0-00010101000000-000000000000
	github.com/shurcooL/httpfs v0.0.0-20190707220628-8d4bc4ba7749 // indirect
	github.com/shurcooL/vfsgen v0.0.0-20200824052919-0d455de96546
	github.com/swaggo/swag v1.6.6-0.20200529100950-7c765ddd0476
	github.com/vektra/mockery/v2 v2.9.4
	go.uber.org/zap v1.19.0
)

replace github.com/pingcap/tidb-dashboard => ../
