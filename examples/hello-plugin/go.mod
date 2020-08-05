module github.com/pingcap-incubator/tidb-dashboard/examples/hello-plugin

go 1.13

require (
	github.com/hashicorp/go-plugin v1.3.0 // indirect
	github.com/pingcap-incubator/tidb-dashboard v0.0.0-20200715070228-47f5de8a6992
)

replace github.com/pingcap-incubator/tidb-dashboard => ../../
