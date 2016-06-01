package main

import (
	"bytes"
	"fmt"
	"log"
	"os"
	"os/exec"
)

func main() {
	var err error

	fmt.Println("hi")

	paths := []string{"f/a", "f/b", "f/c"}
	files := make([]*os.File, 3)
	for i, p := range paths {
		files[i], err = os.Open(p)
		if err != nil {
			log.Fatal(err)
		}
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
	}
	fmt.Printf("out:\n%s", out.String())
	os.Exit(0)
}
