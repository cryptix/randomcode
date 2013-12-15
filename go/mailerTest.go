package main

import (
	"fmt"
	"github.com/robfig/revel/mail"
	"net/smtp"
)

type loginAuth struct {
	username, password string
}

func LoginAuth(username, password string) smtp.Auth {
	return &loginAuth{username, password}
}

func (a *loginAuth) Start(server *smtp.ServerInfo) (string, []byte, error) {
	return "LOGIN", nil, nil
}

func (a *loginAuth) Next(fromServer []byte, more bool) ([]byte, error) {
	if more {
		switch string(fromServer) {
		case "Username:":
			buf := []byte(fmt.Sprintf("%s", a.username))
			return buf, nil
		case "Password:":
			buf := []byte(fmt.Sprintf("%s", a.password))
			return buf, nil
		default:
			return nil, fmt.Errorf("Unknown next from server")
		}
	}

	return nil, nil
}

const (
	user = "##"
	pass = "##"
)

func main() {

	mailer := &mail.Mailer{
		Server: "mail.osteopathie-schule.de",
		Port:   25,
		Auth:   LoginAuth(user, pass),
	}

	msg1 := &mail.Message{
		From:      "rvsp@osteopathie-schule.de",
		To:        []string{"hbu@audiopartner.biz"},
		Subject:   "Some Testmail from the standalone to hbu",
		PlainBody: "Some more plain content!!",
	}

	msg2 := &mail.Message{
		From:      "rvsp@osteopathie-schule.de",
		To:        []string{"henry.bubert@me.com"},
		Subject:   "Some Testmail from the standalone to apple",
		PlainBody: "Some more plain content!!",
	}

	msg3 := &mail.Message{
		From:     "rvsp@osteopathie-schule.de",
		To:       []string{"henry.bubert@tu-harburg.de"},
		Subject:  "Some Testmail from the standalone to tuhh",
		HtmlBody: "<h1>Hi!</h1><p>Some more plain content!!</p>",
	}

	err := mailer.Send(msg1, msg2, msg3)
	if err != nil {
		fmt.Println("Error:", err)
	}
}
