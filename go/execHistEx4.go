package main

import (
	"bytes"
	"fmt"
	"io"
	"os"
	"os/exec"
)

func main() {
	cmd := exec.Command("zsh")

	cmdIn, err := cmd.StdinPipe()
	if err != nil {
		panic(err)
	}

	var out bytes.Buffer
	cmd.Stdout = &out

	err = cmd.Start()
	if err != nil {
		panic(err)
	}

	go func() {
		// stdinBuf := bufio.NewReader(os.Stdin)
		for {
			_, err := io.Copy(cmdIn, os.Stdin)
			fmt.Print("copied stdin")
			fmt.Fprintf(os.Stdout, "stdout:%s\n", out.String())
			if err != nil {
				panic(err)
			}
		}
	}()

	err = cmd.Wait()
	fmt.Printf("zsh done with err %v\n", err)
}
