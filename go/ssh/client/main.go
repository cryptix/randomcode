package main

import (
	"bytes"
	"fmt"
	"io/ioutil"

	"golang.org/x/crypto/ssh"
)

func main() {
	keybytes, err := ioutil.ReadFile("/home/cryptix/.ssh/id_emmBP2")
	if err != nil {
		panic("ReadFile failed")
	}

	signer, err := ssh.ParsePrivateKey(keybytes)
	if err != nil {
		panic("ParsePrivateKey failed" + err.Error())
	}
	config := &ssh.ClientConfig{
		User: "cryptix",
		Auth: []ssh.AuthMethod{
			ssh.PublicKeys(signer),
		},
	}
	client, err := ssh.Dial("tcp", "localhost:22", config)
	if err != nil {
		panic("Failed to dial: " + err.Error())
	}

	// Each ClientConn can support multiple interactive sessions,
	// represented by a Session.
	session, err := client.NewSession()
	if err != nil {
		panic("Failed to create session: " + err.Error())
	}
	defer session.Close()

	// Once a Session is created, you can execute a single command on
	// the remote side using the Run method.
	var b bytes.Buffer
	session.Stdout = &b
	if err := session.Run("zfs list -t snapshots -H"); err != nil {
		panic("Failed to run: " + err.Error())
	}
	fmt.Println(b.String())
}
