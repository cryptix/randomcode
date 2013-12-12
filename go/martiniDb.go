package main

import (
	"database/sql"
	"fmt"
	"strconv"

	"github.com/codegangsta/martini"
)

const (
	DBHandle = "d0185b47:KLcNoqahd2he67Fd@tcp(dd12400.kasserver.com:3306)/d0185b47?charset=utf8mb4,utf8"
)

// Logger returns a middleware handler that logs the request as it goes in and the response as it goes out.
func Mysql() *sql.DB {
	// connect mysql
	db, err := sql.Open("mysql", DBHandle)
	checkErr(err)
	// defer db.Close()

	checkErr(db.Ping())
	return db
}

func listMailTemplates() string {
	return "Hello world!"
}

func dbTest(params martini.Params, db *sql.DB) string {
	var err error
	var a, b int

	if aStr, ok := params["a"]; ok {
		a, err = strconv.Atoi(aStr)
		checkErr(err)
	}
	if bStr, ok := params["b"]; ok {
		b, err = strconv.Atoi(bStr)
		checkErr(err)
	}

	var sum int
	err = db.QueryRow("Select ? + ? AS Sum", a, b).Scan(&sum)
	checkErr(err)

	return fmt.Sprintf("Sum: %d\n", sum)
}

func main() {

	m := martini.Classic()

	m.Map(Mysql())

	m.Get("/list", listMailTemplates)
	m.Get("/dbtest/:a/:b", dbTest)

	m.Run()
}

func checkErr(err error) {
	if err != nil {
		panic(err)
	}
}
