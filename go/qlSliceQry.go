package main

import (
	"database/sql"
	"fmt"
	"log"
	"strconv"
	"strings"

	_ "github.com/cznic/ql/driver"
)

type myStuff struct {
	Id int64
	A  int
	B  string
}

func main() {
	mdb, err := sql.Open("ql-mem", "mem.db")
	check(err)

	tx, err := mdb.Begin()
	check(err)

	_, err = tx.Exec(`CREATE TABLE Stuff(A int, B string);`)
	check(err)

	stmt, err := tx.Prepare("INSERT INTO Stuff (A,B) Values($1,$2)")
	check(err)
	stuff := []myStuff{
		{0, 1, "Some"},
		{0, 9, "xxx"},
		{0, 2, "Stuff"},
		{0, 10, "xxx"},
		{0, 3, "That"},
		{0, 12, "xxx"},
		{0, 23, "please"},
		{0, 42, "dont"},
		{0, 666, "uuaaaarggg"},
	}
	for _, v := range stuff {
		_, err = stmt.Exec(v.A, v.B)
		check(err)
	}
	check(stmt.Close())
	check(tx.Commit())

	fmt.Println("all orderd")
	queryAndPrint(mdb.Query(`SELECT id() as Id, A, B FROM Stuff ORDER BY A`))

	fmt.Println("filtered (static)")
	queryAndPrint(mdb.Query(`SELECT id() as Id, A, B FROM Stuff WHERE A IN (1,2,3,4)`))

	fmt.Println("filtered (by hand)")
	ids := []int64{9, 10, 12}
	queryAndPrint(mdb.Query(`SELECT id() as Id, A, B FROM Stuff WHERE A IN ($1,$2,$3)`, ids[0], ids[1], ids[2]))

	fmt.Println("filtered (semi-nice)")
	ids = []int64{23, 42, 666}
	idStrs := make([]string, len(ids))
	for i, v := range ids {
		idStrs[i] = strconv.FormatInt(v, 10)
	}
	qry := "(" + strings.Join(idStrs, ",") + ")"
	queryAndPrint(mdb.Query(`SELECT id() as Id, A, B FROM Stuff WHERE A IN ` + qry))

	fmt.Println("filtered (i'd like..)")
	ids = []int64{1, 2, 3, 4}
	queryAndPrint(mdb.Query(`SELECT id() as Id, A, B FROM Stuff WHERE id() IN ($1...)`, ids))
}

func queryAndPrint(rows *sql.Rows, err error) {
	check(err)
	for rows.Next() {
		var s myStuff
		err = rows.Scan(&s.Id, &s.A, &s.B)
		check(err)
		fmt.Printf("%+v\n", s)
	}
	check(rows.Err())
	check(rows.Close())
}

func check(err error) {
	if err != nil {
		log.Fatal(err)
	}
}
