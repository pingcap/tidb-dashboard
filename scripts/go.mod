module scripts

go 1.25.7

require (
	github.com/codeskyblue/go-sh v0.0.0-20200712050446-30169cf553fe
	github.com/olekukonko/tablewriter v0.0.5
	github.com/pingcap/log v0.0.0-20210906054005-afc726e70354
	github.com/pingcap/tidb-dashboard v0.0.0-00010101000000-000000000000
	github.com/shurcooL/vfsgen v0.0.0-20200824052919-0d455de96546
	go.uber.org/zap v1.21.0
	golang.org/x/mod v0.34.0
)

require (
	github.com/benbjohnson/clock v1.1.0 // indirect
	github.com/codegangsta/inject v0.0.0-20150114235600-33e0aa1cb7c0 // indirect
	github.com/mattn/go-runewidth v0.0.9 // indirect
	github.com/shurcooL/httpfs v0.0.0-20190707220628-8d4bc4ba7749 // indirect
	go.uber.org/atomic v1.9.0 // indirect
	go.uber.org/multierr v1.11.0 // indirect
	gopkg.in/natefinch/lumberjack.v2 v2.0.0 // indirect
)

replace github.com/pingcap/tidb-dashboard => ../
