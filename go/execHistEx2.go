package main

import (
	"os/exec"
)

func main() {
	app := "zsh"
	//app := "buah"

	arg0 := "-e"
	arg1 := "ls"
	// arg2 := "\n\tfrom"
	// arg3 := "golang"

	cmd := exec.Command(app, arg0, arg1)
	// cmd := exec.Command(app, arg0, arg1, arg2, arg3)
	out, err := cmd.Output()

	if err != nil {
		println(err.Error())
		return
	}

	print(string(out))
}
