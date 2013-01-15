package main

import (
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"strings"
)

func requestGribFile() (fileName, fileSize, fileChecksum string, e error) {
	e = nil
	// ask for file
	// ============
	httpClient := &http.Client{}

	// Parameters
	params := "but=prepfile&la1=11&la2=-11&lo1=-15&lo2=17&res=2&hrs=24&jrs=2&par=W;P;R;C;T;H;m;M;"
	// Security
	security := "l=a07622b82b18524d2088c9b272bb3feeb0eb1737&m=61c9b2b17db77a27841bbeeabff923448b0f6388&tm=085453&client=zyGrib_mac-5.1.1"

	baseUrl := fmt.Sprintf("http://www.zygrib.org/noaa/getzygribfile3.php?%s&%s", params, security)

	req, err := http.NewRequest("GET", baseUrl, nil)
	req.Header.Set("User-Agent", "zyGrib_mac/5.1.1")

	resp, err := httpClient.Do(req)
	if err != nil {
		e = err
		return
	}

	if resp.ContentLength == 0 {
		e = fmt.Errorf("ContentLength == 0")
		return
	} else {

		body, err := ioutil.ReadAll(resp.Body)
		if err != nil {
			e = err
			return
		}
		resp.Body.Close()
		lines := strings.Split(string(body), "\n")

		// parse first request into variables
		for _, str := range lines {
			str = strings.TrimSpace(str)
			s := strings.Split(str, ":")
			if len(s) == 2 {
				// debug
				// fmt.Printf("n:%s - %s\n", s[0], s[1])
				switch s[0] {
				case "file":
					fileName = s[1]
				case "size":
					fileSize = s[1]
				case "checksum":
					fileChecksum = s[1]
				}
			}
		}
	}
	return
}

func getGribFile(name, size, checksum string) {
	//httpClient := &http.Client{}

    //req, err := http.NewRequest("GET", fmt.Sprintf("http://www.zygrib.org/noaa/3130562/%s", name)

}

func main() {

	file, size, checksum, err := requestGribFile()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error:%s", err)
		os.Exit(-1)
	}

	fmt.Printf("File: %s\nSize: %s\nChecksum: %s\n", file, size, checksum)
	os.Exit(0)

}
