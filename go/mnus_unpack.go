// +build ignore

package main

import (
	"archive/zip"
	"fmt"
	"os"
	"path/filepath"
	"sync"

	"gopkg.in/errgo.v1"

	"github.com/cryptix/go/logging"
)

var log = logging.Logger("minus-unpack")

func main() {
	logging.SetupLogging(nil)

	log.Debug("starting")
	m, err := UnpackAll(os.Args[1:]...)
	logging.CheckFatal(err)

	fmt.Println(m)

	log.Info("Done")
}

func UnpackAll(dirs ...string) (map[string]int, error) {
	done := make(chan struct{})
	defer close(done)

	zips, errc := getZips(done, dirs...)

	// throttle
	c := make(chan zipResult)
	var wg sync.WaitGroup
	const numDigesters = 20
	wg.Add(numDigesters)
	for i := 0; i < numDigesters; i++ {
		go func() {
			unpacker(done, zips, c)
			wg.Done()
		}()
	}
	go func() {
		wg.Wait()
		close(c)
	}()
	// End of pipeline. OMIT
	m := make(map[string]int)
	for r := range zips {
	}
	if err := <-errc; err != nil {
		return nil, err
	}
	return m, nil
}

func unpacker(done <-chan struct{}, zips <-chan zipResult) {
	for z := range zips {
		log.WithField("result", r).Debug("got zipResult")
		if r.err != nil {
			return nil, r.err
		}
		defer r.zrc.Close()

		// todo unpack each file.. more stages?
		for _, zf := range r.zrc.File {
			log.WithField("zip", r.zipName).WithField("f", zf.Name).Debug("zip file")
		}

	}
}

type zipResult struct {
	zipName string
	zrc     *zip.ReadCloser
	err     error
}

func getZips(done <-chan struct{}, dirs ...string) (<-chan zipResult, <-chan error) {
	c := make(chan zipResult)
	errc := make(chan error, 1)

	go func() {
		var wg sync.WaitGroup

		for _, d := range dirs {
			files, err := filepath.Glob(d)
			if err != nil {
				errc <- errgo.Notef(err, "glob failed: %s", d)
				continue
			}
			log.WithField("files", len(files)).Debug("globbed")

			for _, f := range files {
				wg.Add(1)
				go func(f string) {
					rc, err := zip.OpenReader(f)
					select {
					case c <- zipResult{f, rc, err}:
					case <-done:
					}
					wg.Done()
				}(f)
			}
		}
		// iterated over all dirs
		go func() {
			wg.Wait()
			close(c)
			log.Info("getZips done")
		}()
		errc <- nil
	}()
	return c, errc
}

//	out := make(chan *zip.ReadCloser)
//<-chan *zip.ReadCloser
