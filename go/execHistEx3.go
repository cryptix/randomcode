package main

import (
	"os/exec"
)

func main() {
	cmd := exec.Command("/usr/local/bin/zsh", "-e", "ls")
}
