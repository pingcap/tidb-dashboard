// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package main

import (
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/shhdgit/testfixtures/v3"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func main() {
	if len(os.Args) < 1 {
		log.Fatal("Require 1 arg db.table")
	}
	dbTable := os.Args[1]
	s := strings.Split(dbTable, ".")
	dbName := s[0]
	tableName := s[1]

	gormDB, err := gorm.Open(mysql.Open(fmt.Sprintf("root:@tcp(127.0.0.1:4000)/%s?charset=utf8&parseTime=True&loc=Local", dbName)))
	if err != nil {
		panic(err)
	}
	db, err := gormDB.DB()
	if err != nil {
		panic(err)
	}

	dumper, err := testfixtures.NewDumper(
		testfixtures.DumpDatabase(db),
		testfixtures.DumpDialect("tidb"),
		testfixtures.DumpDirectory("tests/fixtures"),
		testfixtures.DumpTables(
			tableName,
		),
	)
	if err != nil {
		panic(err)
	}
	if err := dumper.Dump(); err != nil {
		panic(err)
	}
}
