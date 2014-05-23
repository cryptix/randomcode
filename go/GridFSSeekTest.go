package main

import (
	"fmt"
	"io"
	"os"

	"labix.org/v2/mgo"
)

const (
	dbHost = "localhost"
	dbName = "gridfstest"
)

// SeekUser just contains a io.WriteSeeker
type SeekUser struct {
	output io.WriteSeeker
}

var pattern = []byte("abcdefghijkl")

// Init just writes some pattern into the file
func (s SeekUser) Init() error {
	n, err := s.output.Write(pattern)
	if err != nil {
		return fmt.Errorf("error during s.output.Write(): %s", err)
	}

	if n != len(pattern) {
		return fmt.Errorf("didn't write pattern properly.\nWrote %d, wanted %d\n", n, len(pattern))
	}

	return nil
}

// DoStuff seeks back to the begining and writes over some bytes
func (s SeekUser) DoStuff() error {
	_, err := s.output.Seek(3, os.SEEK_SET)
	if err != nil {
		return fmt.Errorf("error during s.output.Seek(): %s", err)
	}

	_, err = s.output.Write([]byte("123"))
	if err != nil {
		return fmt.Errorf("error during s.output.Write(): %s", err)
	}

	return nil
}

// NewSeekUser returns a new SeekUser, using the passed io.WriteSeeker
func NewSeekUser(out io.WriteSeeker) *SeekUser {
	return &SeekUser{out}
}

func main() {

	mgoSession, err := mgo.Dial(fmt.Sprintf("%s/%s", dbHost, dbName))
	checkErr(err)

	mgoDb := mgoSession.DB(dbName)

	mgoGrid := mgoDb.GridFS("fs")

	target, err := mgoGrid.Create("TestFile")
	checkErr(err)

	target.SetChunkSize(1000)

	su := NewSeekUser(target)

	err = su.Init()
	checkErr(err)

	err = su.DoStuff()
	checkErr(err)

}

func checkErr(err error) {
	if err != nil {
		panic(err)
	}
}
