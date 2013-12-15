package main

import (
	"database/sql"
	"encoding/csv"
	"fmt"
	_ "github.com/go-sql-driver/mysql"
	"io"
	"os"
	"strings"
)

type listenDef struct {
	fname   string
	fieldId []int
}

func main() {
	definitionen := []listenDef{
		listenDef{"mitgliederliste-dgko.csv", []int{3, 4, 14}},
		listenDef{"mitgliederliste-EGKO.csv", []int{3, 4, 14}},
		listenDef{"mitgliederliste-vosd.csv", []int{2, 3, 13}},
	}

	db, err := sql.Open("mysql", "root:tinchen@/osdWerKommt")
	if err != nil {
		panic(err.Error())
	}
	defer db.Close()

	err = db.Ping()
	if err != nil {
		panic(err.Error())
	}

	query := "insert into `Attendee` (`First`,`Last`,`Email`,`Status`,`ActFor1`,`ActFor2`) values (?,?,?,0,0,0)"
	stmt, err := db.Prepare(query)
	if err != nil {
		panic(err)
	}

	for _, def := range definitionen {

		file, err := os.Open(def.fname)
		if err != nil {
			panic(err)
		}
		defer file.Close()

		reader := csv.NewReader(file)
		reader.Comma = ':'
		reader.FieldsPerRecord = -1
		reader.TrailingComma = true

		tx, err := db.Begin()
		if err != nil {
			panic(err)
		}

		for {
			rec, err := reader.Read()
			if err != nil {
				if err == io.EOF {
					fmt.Fprintln(os.Stderr, def.fname, " - Done")
					break
					// os.Exit(0)
				}
				panic(err)
			}

			// handle record
			// fmt.Fprintf(os.Stderr, "rec:%#v\n", rec)

			nachname := strings.TrimSpace(rec[def.fieldId[0]])
			vorname := strings.TrimSpace(rec[def.fieldId[1]])
			email := strings.TrimSpace(rec[def.fieldId[2]])
			if email == "" {
				fmt.Fprintf(os.Stderr, "Error - No Email: %s %s\n", vorname, nachname)
				continue
			}

			_, err = tx.Stmt(stmt).Exec(vorname, nachname, email)
			if err != nil {
				panic(err)
			}
			// fmt.Println(res.RowsAffected())
			// fmt.Printf("%s:%s:%s\n", vorname, nachname, email)
		}
		tx.Commit()
	}

}
