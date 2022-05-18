module scripts

go 1.13

require (
	github.com/codeskyblue/go-sh v0.0.0-20200712050446-30169cf553fe
	github.com/olekukonko/tablewriter v0.0.5
	github.com/pingcap/log v0.0.0-20210906054005-afc726e70354
	github.com/pingcap/tidb-dashboard v0.0.0-00010101000000-000000000000
	github.com/shurcooL/httpfs v0.0.0-20190707220628-8d4bc4ba7749 // indirect
	github.com/shurcooL/vfsgen v0.0.0-20200824052919-0d455de96546
	github.com/swaggo/swag v1.7.6
	github.com/vektra/mockery/v2 v2.12.2
	go.uber.org/zap v1.19.0
	golang.org/x/mod v0.6.0-dev.0.20220106191415-9b9b3d81d5e3
)

replace github.com/pingcap/tidb-dashboard => ../
