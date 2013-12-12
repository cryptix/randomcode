package main

import (
	"fmt"
	"github.com/libgit2/git2go"
)

const (
	repoPath = "/Users/cryptix/"
)

func main() {

	repo := git.OpenRepository(repoPath)

	repo.Cl

	fmt.Printf("Git: %d\n", 1)
}
