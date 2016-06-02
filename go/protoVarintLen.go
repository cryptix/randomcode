package main

import (
	"fmt"
	"os"
	"text/tabwriter"

	"github.com/google/protobuf/proto"
)

func main() {
	fmt.Println("ohai")

	w := tabwriter.NewWriter(os.Stdout, 1, 2, 1, ' ', 0)

	fmt.Fprintf(w, "I\tLen\n")

	var i uint64
	for i = 1; i <= 1024*1024; i *= 2 {
		buf := proto.EncodeVarint(i)
		fmt.Fprintf(w, "%d\t%d bytes\n", i, len(buf))
	}

	w.Flush()
}
