package main

import (
	"flag"
	"fmt"
	"io"
	"os"
	"time"

	"labix.org/v2/mgo"
)

const (
	dbHost = "localhost"
	dbName = "blog"
)

func main() {
	flag.Parse()

	if flag.NArg() < 1 {
		fmt.Fprintln(os.Stderr, "Usage copyTest filename")
		os.Exit(1)
	}

	start := time.Now()
	input, err := os.Open(flag.Arg(0))
	checkErr(err)
	defer input.Close()

	mgoSession, err := mgo.Dial(fmt.Sprintf("%s/%s", dbHost, dbName))
	checkErr(err)

	mgoDb := mgoSession.DB("copyTest")

	mgoGrid := mgoDb.GridFS("fs")

	target, err := mgoGrid.Create(flag.Arg(0))
	checkErr(err)

	n, err := io.Copy(target, input)
	checkErr(err)

	err = target.Close()
	checkErr(err)

	fmt.Printf("Done, copied %d bytes. Took: %v\n", n, time.Since(start))

}

func checkErr(err error) {
	if err != nil {
		panic(err)
	}
}
