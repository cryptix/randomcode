package main

import (
	"encoding/csv"
	"fmt"

	"io"

	"os"
)

func main() {
	file, err := os.Open("mitgliederliste-EGKO.csv")
	if err != nil {
		panic(err)
	}
	defer file.Close()

	reader := csv.NewReader(file)
	reader.Comma = ':'
	reader.FieldsPerRecord = -1
	reader.TrailingComma = true

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

		// fmt.Printf("%s:%s:%s\n", vorname, nachname, email)
	}
}
