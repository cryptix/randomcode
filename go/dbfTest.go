package main

import (
	"fmt"
	"io"
	"os"

	"github.com/cryptix/DBaseReader"
)

func main() {
	if len(os.Args) != 2 {
		fmt.Fprintf(os.Stderr, "Usage: dbfTest <filename>\n")
		os.Exit(1)
	}

	file, err := os.Open(os.Args[1])
	checkErr(err)

	dbr, err := DBaseReader.NewReader(file)
	checkErr(err)

	// dbr.PrintHeaderInfo()

	// dbr.PrintFieldsInfo()

	for {
		// for i := 0; i < 10; i++ {

		rec, err := dbr.ReadRecord()
		if err == io.EOF {
			break
		} else if err != nil {
			panic(err)
		}

		fmt.Printf("Record: %#v\n", rec)
	}
}

func checkErr(err error) {
	if err != nil {
		panic(err)
	}
}
