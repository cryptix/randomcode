// +build ignore

package main

import (
	"io"
	"net/http"
	"net/url"
	"os"
	"sync"

	"github.com/cryptix/go/logging"
	"github.com/rs/xlog"
)

const base = "http://members.m-nus.com/download.pl?memberfile="

var memberFiles = []string{}

var log = logging.Logger("minus-fetch")

func main() {
	logging.SetupLogging(nil)

	baseUrl, err := url.Parse(base)
	logging.CheckFatal(err)

	var wg sync.WaitGroup
	for _, f := range memberFiles {
		wg.Add(1)
		go func(pkg string) {
			defer wg.Done()
			qry := baseUrl.Query()
			qry.Set("memberfile", pkg)

			baseUrl.RawQuery = qry.Encode()

			req, err := http.NewRequest("GET", baseUrl.String(), nil)
			logging.CheckFatal(err)
			req.SetBasicAuth("werryBreight", "tinchen")

			resp, err := http.DefaultClient.Do(req)
			logging.CheckFatal(err)

			if resp.StatusCode != http.StatusOK {
				log.Error("%s: http status: %s", pkg, resp.Status)
				return
			}
			outF, err := os.Create(pkg)
			logging.CheckFatal(err)

			_, err = io.Copy(outF, resp.Body)
			logging.CheckFatal(err)

			outF.Close()
			resp.Body.Close()
			log.Info("copy done", xlog.F{"pkg": pkg})
		}(f)
	}

	wg.Wait()
	log.Info("Done")

}
