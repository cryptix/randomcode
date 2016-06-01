package main

import (
	"encoding/hex"
	"fmt"
	"log"

	"github.com/jbenet/go-multihash"
)

func main() {
	buf, err := hex.DecodeString("b46712bdcb657b3acc8d2f6743f073a804261215")
	check(err)

	mhbuf, err := multihash.EncodeName(buf, "sha1")
	check(err)
	fmt.Printf("hex: %v\n", hex.EncodeToString(mhbuf))
}

func check(err error) {
	if err != nil {
		log.Fatal(err)
	}
}
