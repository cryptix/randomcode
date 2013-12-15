package main

import (
	"encoding/csv"
	"fmt"

	"io"

	"os"
)

func main() {
	file, err := os.Open("mitgliederliste-vosd.csv")
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

		vorname := rec[3]
		nachname := rec[2]
		email := rec[13]
		if email == "" {
			fmt.Fprintf(os.Stderr, "Error - No Email: %s %s\n", vorname, nachname)
			continue
		} else if vorname == "" || nachname == "" {
			fmt.Fprintf(os.Stderr, "Error - No Name: %s\n", rec)
			continue
		}

		// fmt.Printf("%s:%s:%s\n", vorname, nachname, email)
	}
}
