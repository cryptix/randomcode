// Hellofs implements a simple "hello world" file system.
package main

import (
	"flag"
	"fmt"
	"log"
	"os"

	"bazil.org/fuse"
	"bazil.org/fuse/fs"
)

var Usage = func() {
	fmt.Fprintf(os.Stderr, "Usage of %s:\n", os.Args[0])
	fmt.Fprintf(os.Stderr, "  %s MOUNTPOINT\n", os.Args[0])
	flag.PrintDefaults()
}

var (
	newInode chan uint64
	files    map[string]*File
)

func main() {
	// parse flags
	flag.Usage = Usage
	flag.Parse()

	if flag.NArg() != 1 {
		Usage()
		os.Exit(2)
	}
	mountpoint := flag.Arg(0)

	// init inode generator
	newInode = make(chan uint64)
	go func() {
		var counter uint64 = 2 // start with 2, 1 is dir root
		for {
			newInode <- counter
			counter += 1
		}
	}()

	files = make(map[string]*File)

	files["hello"] = NewFile("hello", []byte("Hello, world!\n"))
	files["lulz.sh"] = NewFile("lulz.sh", []byte("#!/bin/bash\necho lulz\n"))

	// startup mount
	c, err := fuse.Mount(mountpoint)
	if err != nil {
		log.Fatal(err)
	}
	defer c.Close()

	log.Println("Serving ", mountpoint)
	err = fs.Serve(c, FS{})
	if err != nil {
		log.Fatal(err)
	}

	// check if the mount process has an error to report
	<-c.Ready
	if err := c.MountError; err != nil {
		log.Fatal(err)
	}
}

// FS implements the hello world file system.
type FS struct{}

func (FS) Root() (fs.Node, fuse.Error) {
	log.Println("returning root node")
	return Dir{"Root"}, nil
}

// Dir implements both Node and Handle for the root directory.
type Dir struct {
	name string
}

func (Dir) Attr() fuse.Attr {
	log.Println("Attr lookup")
	return fuse.Attr{Inode: 1, Mode: os.ModeDir | 0555}
}

func (Dir) Lookup(name string, intr fs.Intr) (fs.Node, fuse.Error) {
	log.Println("Name lookup:", name)
	_, ok := files[name]
	if !ok {
		return nil, fuse.ENOENT

	}

	return File{name: name}, nil
}

func (Dir) ReadDir(intr fs.Intr) ([]fuse.Dirent, fuse.Error) {
	log.Println("Returning Dir entries")

	ents := make([]fuse.Dirent, 0, len(files))
	for _, v := range files {
		ents = append(ents, v.Dirent)
	}

	return ents, nil
}

func (d Dir) Create(req *fuse.CreateRequest, resp *fuse.CreateResponse, intr fs.Intr) (fs.Node, fs.Handle, fuse.Error) {
	log.Println("Create Req on:", d.name)
	log.Printf("Req: %+v\n", req)

	_, exists := files[req.Name]
	if exists == true {
		req.RespondError(fuse.EPERM)
		return nil, nil, fuse.EPERM
	}

	newFile := NewFile(req.Name, []byte(""))
	newFile.Fattr.Mode = req.Mode
	log.Printf("New File: %+v\n", newFile)
	files[req.Name] = newFile

	// dont know yet what the response is for
	// works without..

	// resp.Attr = newFile.Fattr
	// resp.AttrValid = time.Minute * 1
	// resp.EntryValid = time.Minute * 1

	// log.Printf("Resp: %+v\n", resp)
	// req.Respond(resp)

	return newFile, newFile, nil
}
