package main

import (
	"bytes"
	"os"

	"labix.org/v2/mgo"
)

func main() {
	session, err := mgo.Dial("localhost/testDB")
	check(err)
	defer session.Close()

	db := session.DB("mydb")

	gfs := db.GridFS("fs")
	file, err := gfs.Create("")
	check(err)
	id := file.Id()

	file.SetChunkSize(5)

	n, err := file.Write([]byte("abcdefghijklmnopqrstuv"))
	check(err)
	if n != 22 {
		panic("n != 22")
	}

	err = file.Close()
	check(err)

	b := make([]byte, 5)

	file, err = gfs.OpenId(id)
	check(err)

	o, err := file.Seek(3, os.SEEK_SET)
	check(err)
	if o != 3 {
		panic("o != 3")
	}

	_, err = file.Read(b)
	check(err)
	if bytes.Compare(b, []byte("defgh")) != 0 {
		panic("b uneqal to []byte(\"defgh\")")
	}

	o, err = file.Seek(5, os.SEEK_CUR)
	check(err)
	if o != 13 {
		panic("o != 13")
	}
	_, err = file.Read(b)
	check(err)
	if bytes.Compare(b, []byte("nopqr")) != 0 {
		panic("b uneqal nopqr")
	}

	o, err = file.Seek(-10, os.SEEK_END)
	check(err)
	if o != 12 {
		panic("o != 12")
	}
	_, err = file.Read(b)
	check(err)
	if bytes.Compare(b, []byte("mnopq")) != 0 {
		panic("b uneqal mnopq")
	}

	o, err = file.Seek(8, os.SEEK_SET)
	check(err)
	if o != 8 {
		panic("o != 8")
	}
	_, err = file.Read(b)
	check(err)
	if bytes.Compare(b, []byte("ijklm")) != 0 {
		panic("b uneqal ijklm")
	}

	// Trivial seek forward within same chunk. Already
	// got the data, shouldn't touch the database.
	// sent := mgo.GetStats().SentOps
	// o, err = file.Seek(1, os.SEEK_CUR)
	// check(err)
	// if o != 14 {
	// 	panic("o != 14")
	// }
	// if mgo.GetStats().SentOps != sent {
	// 	panic("sentOps != snet")
	// }

	// _, err = file.Read(b)
	// check(err)
	// if bytes.Compare(b, []byte("opqrs")) != 0 {
	// 	panic("b uneqal to []byte(\"opqrs\")")
	// }

	// // Try seeking past end of file.
	// file.Seek(3, os.SEEK_SET)
	// o, err = file.Seek(23, os.SEEK_SET)
	// c.Assert(err, ErrorMatches, "seek past end of file")
}

func check(err error) {
	if err != nil {
		panic(err)
	}
}
