package main

import (
	"os"
)

func main() {
	attr := os.ProcAttr{}
	attr.Env = []string{"HISTFILE=/tmp/test1"}

	argv := []string{"-e", "ls"}

	proc, err := os.StartProcess("/usr/local/bin/zsh", argv, &attr)
	if err != nil {
		panic(err)
	}
	proc.Wait()
}
