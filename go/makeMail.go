package main

import (
	"bytes"
	"log"
	"net/textproto"
	"os/exec"

	"github.com/jordan-wright/email"
)

const to = "henry.bubert@me.com"

func main() {
	e := &email.Email{
		To:      []string{to},
		From:    "Henry Bubert <hbu@audiopartner.biz>",
		Subject: "Awesome Subject",
		Text:    []byte("Text Body is, of course, supported!"),
		HTML:    []byte("<h1>Fancy HTML is supported, too!</h1>"),
		Headers: textproto.MIMEHeader{},
	}

	raw, err := e.Bytes()
	if err != nil {
		log.Fatal(err)
	}

	log.Println(string(raw))

	cmd := exec.Command("sendmail", "-v", to)
	cmd.Stdin = bytes.NewReader(raw)

	out, err := cmd.CombinedOutput()
	log.Println("Out:", string(out))
	if err != nil {
		log.Fatal(err)
	}

}
