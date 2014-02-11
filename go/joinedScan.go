package main

import (
	"database/sql"
	_ "github.com/go-sql-driver/mysql"
	"log"
)

const sqlConf = "root:root@tcp(localhost:3306)/testJoinScan"

const joinQry = `
select 
	t.Id,
	t.Name,
	t.Vorname,
	p.Id,
	p.Dozent,
	p.Inhalte
from 
	Teilnehmer t
join
	Protokoll p
	on p.Teilnehmer_id = t.Id
where
	klasse_id = ?
`

type Teilnehmer struct {
	Id      int64
	Name    string
	Vorname string
}

type Protokoll struct {
	Id           int64
	TeilnehmerId int64
	Dozent       string
	Inhalte      string
}

func main() {

	db, err := sql.Open("mysql", sqlConf)
	checkErr(err)

	stmt, err := db.Prepare(joinQry)
	checkErr(err)

	rows, err := stmt.Query(62)
	checkErr(err)

	var (
		tn    Teilnehmer
		proto Protokoll
	)
	fields := []interface{}{&tn.Id, &tn.Name, &tn.Vorname, &proto.Id, &proto.Dozent, &proto.Inhalte}

	for rows.Next() {
		checkErr(rows.Err())

		err = rows.Scan(fields...)
		checkErr(err)

		log.Printf("\nTeilnehmer:%v\nProtokoll:%v\n", tn, proto)
	}
}

func checkErr(err error) {
	if err != nil {
		log.Fatal(err)
	}
}
