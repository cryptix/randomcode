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

var newInode chan uint64

func main() {
	flag.Usage = Usage
	flag.Parse()

	if flag.NArg() != 1 {
		Usage()
		os.Exit(2)
	}
	mountpoint := flag.Arg(0)

	newInode := make(chan uint64)
	go func() {
		var counter uint64 = 0
		for {
			newInode <- counter
			counter += 1
		}
	}()

	c, err := fuse.Mount(mountpoint)
	if err != nil {
		log.Fatal(err)
	}
	defer c.Close()

	fmt.Println("Serving ", mountpoint)
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
	fmt.Println("returning root node")
	return Dir{"Root"}, nil
}

// Dir implements both Node and Handle for the root directory.
type Dir struct {
	name string
}

func (Dir) Attr() fuse.Attr {
	fmt.Println("Attr lookup")
	return fuse.Attr{Inode: 1, Mode: os.ModeDir | 0555}
}

func (Dir) Lookup(name string, intr fs.Intr) (fs.Node, fuse.Error) {
	fmt.Println("Name lookup:", name)
	_, ok := files[name]
	if !ok {
		return nil, fuse.ENOENT

	}

	return File{name: name}, nil
}

var files = map[string]fuse.Dirent{
	"hello": {Inode: 2, Name: "hello", Type: fuse.DT_File},
	"lulz":  {Inode: 3, Name: "lulz", Type: fuse.DT_File},
}

func (Dir) ReadDir(intr fs.Intr) ([]fuse.Dirent, fuse.Error) {
	fmt.Println("Returning Dir entries")

	ents := make([]fuse.Dirent, 0, len(files))
	for _, v := range files {
		ents = append(ents, v)
	}

	return ents, nil
}

func (d Dir) Create(req *fuse.CreateRequest, resp *fuse.CreateResponse, intr fs.Intr) (fs.Node, fs.Handle, fuse.Error) {
	fmt.Printf("Create Req for %s: %+v\n", d.name, req)
	return nil, nil, fuse.ENOENT
}

// File implements both Node and Handle for the hello file.
type File struct {
	fs.NodeRef
	name string
}

func (f File) Attr() fuse.Attr {
	fmt.Println("Attr() for:", f.name)
	switch f.name {
	case "lulz":
		return fuse.Attr{Inode: files[f.name].Inode, Mode: 0444}
	case "hello":
		return fuse.Attr{Inode: files[f.name].Inode, Mode: 0555}
	}

	return fuse.Attr{}
}

// func (f File) Open(req *fuse.OpenRequest, resp *fuse.OpenResponse, intr fs.Intr) (fs.Handle, fuse.Error) {
// 	fmt.Printf("Open Req for %s: %+v\n", f.name, req)
// 	return nil, fuse.ENOENT
// }

func (f File) ReadAll(intr fs.Intr) ([]byte, fuse.Error) {
	fmt.Println("ReadAll for:", f.name)
	return []byte("hello, world\n"), nil
}
