package main

import (
	"bytes"
	"io"
	"io/ioutil"
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

	content *bytes.Reader
	name    string
}

func NewFile(name string, content []byte) *File {
	id := <-newInode
	now := time.Now()
	return &File{
		name:    name,
		content: bytes.NewReader(content),
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

	contentLen := int64(f.content.Len())
	size := req.Size
	if int64(size)+req.Offset >= contentLen {
		size -= int((int64(size) + req.Offset) - contentLen)
	}

	buf := make([]byte, size)
	n, err := f.content.ReadAt(buf, req.Offset)
	if err == io.EOF {
		err = nil
	}
	if err != nil {
		log.Printf("File READ on %s at %d error:%v\n", f.name, req.Offset, err)
		return fuse.EIO
	}

	res.Data = buf[:n]
	return nil
}

func (fHandle File) Write(req *fuse.WriteRequest, resp *fuse.WriteResponse, intr fs.Intr) fuse.Error {
	log.Println("File Write on", fHandle.name)
	log.Printf("Req: %#v\n", req)
	log.Println("Offset:", req.Offset)
	log.Println("Data:", string(req.Data))

	f, ok := files[fHandle.name]
	if !ok {
		return fuse.EIO
	}

	buf, err := ioutil.ReadAll(f.content)
	if err != nil {
		log.Printf("File internal copy to new buffer failed. File:%s error:%v\n", f.name, err)
		return fuse.EIO
	}

	// overwriting buffer with new data
	off := int(req.Offset)
	size := len(req.Data)
	copy(buf[off:off+size], req.Data)

	// create new buffer and update size
	f.content = bytes.NewReader(buf)
	f.Fattr.Size = uint64(len(buf))
	resp.Size = size

	return nil
}
