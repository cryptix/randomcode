package main

import (
	"bytes"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"os/exec"
)

func main() {
	var err error

	fmt.Println("hi")

	files := make([]*os.File, 3)
	for i, _ := range files {
		files[i], err = ioutil.TempFile("", "firfoo")
		if err != nil {
			log.Fatal(err)
		}

		fmt.Fprintf(files[i], "firfoo%d", i)
		files[i].Seek(0, os.SEEK_SET)
	}

	cmd := exec.Command("c/a.out")
	cmd.ExtraFiles = files
	var out bytes.Buffer
	cmd.Stdout = &out

	if err = cmd.Run(); err != nil {
		log.Fatal(err)
	}

	for _, f := range files {
		if err = f.Close(); err != nil {
			log.Fatal(err)
		}
		os.Remove(f.Name())
	}
	fmt.Printf("out:\n%s", out.String())
	os.Exit(0)
}
