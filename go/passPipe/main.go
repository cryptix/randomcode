package main

import (
	"bytes"
	"fmt"
	"log"
	"math/rand"
	"os"
	"os/exec"
	"strconv"
	"time"
)

func main() {
	rand.Seed(time.Now().UnixNano())
	var err error

	i := rand.Int() % 255
	fmt.Printf("randing %d files\n", i)

	readMe := make([]*os.File, i)
	for i, _ := range readMe {
		var writeMe *os.File
		readMe[i], writeMe, err = os.Pipe()
		if err != nil {
			log.Fatal(err)
		}

		fmt.Fprintf(writeMe, "firfoo%d\"", rand.Int())
		writeMe.Close()

	}

	cmd := exec.Command("c/a.out", strconv.Itoa(i))
	cmd.ExtraFiles = readMe
	var out bytes.Buffer
	cmd.Stdout = &out

	if err = cmd.Run(); err != nil {
		log.Fatal(err)
	}

	for _, f := range readMe {
		if err = f.Close(); err != nil {
			log.Fatal(err)
		}
	}
	fmt.Printf("out:\n%s", out.String())
	os.Exit(0)
}
