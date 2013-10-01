package main

import (
	"bufio"
	"code.google.com/p/go.crypto/ssh/terminal"
)

func main() {
	oldState, err := terminal.MakeRaw(0)
	if err != nil {
		panic(err)
	}
	defer terminal.Restore(0, oldState)

	// cmd := exec.Command("zsh")

	// buffedStdin := bufio.NewReader(cmd.Stdin)
	// buffedStdout := bufio.NewWriter(cmd.Stdout)
	// cmdPipe := bufio.NewReadWriter(buffedStdin, buffedStdout)
	// cmdPipe := io.ReadWriter{cmd.Stdout, cmd.Stdin}
	// err = cmd.Start()
	// if err != nil {
	// 	panic(err)
	// }
	// term := terminal.NewTerminal(cmdPipe, ">")
	// term.Write([]byte("ls"))

	// err = cmd.Start()
	// if err != nil {
	// 	panic(err)
	// }

	// term := terminal.NewTerminal(rw, ">")
	// str, err := term.ReadLine()
	// if err != nil {
	// 	panic(err)
	// }
	// fmt.Printf("read: %s\n", str)
}
