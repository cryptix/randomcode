package main

import (
	"log"
	"time"

	"bazil.org/fuse"
	"bazil.org/fuse/fs"
)

// File implements both Node and Handle for the hello file.
type File struct {
	fs.NodeRef
	Dirent fuse.Dirent
	Fattr  fuse.Attr

	content []byte
	name    string
}

func NewFile(name string, content []byte) *File {
	id := <-newInode
	now := time.Now()
	return &File{
		name:    name,
		content: content,
		Fattr: fuse.Attr{
			Inode: id,
			Mode:  0444,
			Size:  uint64(len(content)),
			Ctime: now,
			Atime: now,
			Mtime: now,
		},
		Dirent: fuse.Dirent{Inode: id, Name: name, Type: fuse.DT_File},
	}
}

func (f File) Attr() fuse.Attr {
	log.Println("Attr() for:", f.name)

	file, found := files[f.name]
	if !found {
		return fuse.Attr{}
	}

	return file.Fattr
}

// stolen shamelessly from camlistore
func (fHandle File) Read(req *fuse.ReadRequest, res *fuse.ReadResponse, intr fs.Intr) fuse.Error {
	log.Printf("File READ on %v: %#v", fHandle.name, req)
	f, ok := files[fHandle.name]
	if !ok {
		return fuse.EIO
	}

	contentLen := int64(len(f.content))
	if req.Offset >= contentLen {
		return nil
	}

	size := req.Size
	if int64(size)+req.Offset >= contentLen {
		size -= int((int64(size) + req.Offset) - contentLen)
	}

	res.Data = f.content[req.Offset:size]
	return nil
}

func (fHandle File) Write(req *fuse.WriteRequest, resp *fuse.WriteResponse, intr fs.Intr) fuse.Error {
	log.Println("File Write on", fHandle.name)
	log.Printf("Req: %+v\n", req)
	log.Println("Offset:", req.Offset)
	log.Println("Data:", string(req.Data))
	_, ok := files[fHandle.name]
	if !ok {
		return fuse.EIO
	}

	return fuse.EIO
}
