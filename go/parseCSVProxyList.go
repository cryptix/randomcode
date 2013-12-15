package main

import (
	"database/sql"
	"encoding/csv"
	"fmt"
	"github.com/coopernurse/gorp"
	_ "github.com/go-sql-driver/mysql"
	"io"
	"log"
	"os"
)

type Attendee struct {
	AttendeeId         int64
	First, Last, Email string
	Status             int
	ActFor1, ActFor2   int64
	// EmailVerify        string
	// LastContact        time.Time // use unix timestamp if time.Time is still bugged
}

func openMysql() *gorp.DbMap {
	db, err := sql.Open("mysql", "root:tinchen@/osdWerKommt")
	if err != nil {
		panic(err.Error())
	}
	// defer db.Close()

	err = db.Ping()
	if err != nil {
		panic(err.Error())
	}

	dbmap := &gorp.DbMap{Db: db, Dialect: gorp.MySQLDialect{"InnoDB", "UTF8"}}
	dbmap.TraceOn("[gorp]", log.New(os.Stdout, "gorpExamp:", log.Lmicroseconds))

	dbmap.AddTable(Attendee{}).SetKeys(true, "AttendeeId")

	err = dbmap.CreateTablesIfNotExists()
	if err != nil {
		panic(err.Error())
	}

	return dbmap
}

func main() {
	file, err := os.Open("mitgliederliste-dgko.csv")
	if err != nil {
		panic(err)
	}
	defer file.Close()

	reader := csv.NewReader(file)
	reader.Comma = ':'
	reader.FieldsPerRecord = -1
	reader.TrailingComma = true

	mysqlDbMap := openMysql()

	for {
		rec, err := reader.Read()
		if err != nil {
			if err == io.EOF {
				fmt.Fprintln(os.Stderr, "Done")
				os.Exit(0)
			}
			panic(err)
		}

		// handle record
		// fmt.Fprintf(os.Stderr, "rec:%#v\n", rec)

		vorname := rec[4]
		nachname := rec[3]
		email := rec[14]
		if email == "" {
			fmt.Fprintf(os.Stderr, "Error - No Email: %s %s\n", vorname, nachname)
			continue
		}

		newUser := Attendee{0, vorname, nachname, email, 0, 0, 0}
		err = mysqlDbMap.Insert(&newUser)
		if err != nil {
			panic(err)
		}
		// fmt.Printf("%s:%s:%s\n", vorname, nachname, email)
	}
}
