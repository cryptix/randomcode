package main

import (
	"encoding/binary"
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"net"
	"os/exec"
	"sync"
	"syscall"
	"unsafe"

	"github.com/kr/pty"
	"github.com/shurcooL/go-goon"
	"golang.org/x/crypto/ssh"
)

func main() {

	config := &ssh.ServerConfig{
		PasswordCallback: func(c ssh.ConnMetadata, pass []byte) (*ssh.Permissions, error) {
			// Should use constant-time compare (or better, salt+hash) in a production setting.
			if c.User() == "foo" && string(pass) == "bar" {
				return nil, nil
			}
			return nil, fmt.Errorf("password rejected for %q", c.User())
		},
	}

	privBytes, err := ioutil.ReadFile("id_rsa")
	check(err)

	privKey, err := ssh.ParsePrivateKey(privBytes)
	check(err)

	config.AddHostKey(privKey)
	check(err)

	listener, err := net.Listen("tcp", ":0")
	check(err)

	log.Printf("Listening to %v", listener.Addr())

	for {
		conn, err := listener.Accept()
		if err != nil {
			log.Printf("Failed to accept incoming conenction (%s)", err)
			continue
		}

		sshConn, chans, reqs, err := ssh.NewServerConn(conn, config)
		if err != nil {
			log.Printf("Failed to handshake (%s)", err)
			continue
		}

		log.Printf("New SSH connection from %s (%s)", sshConn.RemoteAddr(), sshConn.ClientVersion())
		// Log all global out-of-band Requests and discard them
		go handleRequests(reqs)

		// Accept all channels
		go handleChannels(chans)

	}
}

func check(err error) {
	if err != nil {
		log.Fatal(err)
	}
}

func handleRequests(in <-chan *ssh.Request) {
	for req := range in {
		log.Println("oob req:")
		goon.Dump(req)
		if req.WantReply {
			req.Reply(false, nil)
		}
	}
}

func handleChannels(chans <-chan ssh.NewChannel) {
	for newChannel := range chans {
		log.Printf("newChannel:")
		goon.Dump(newChannel)
		if t := newChannel.ChannelType(); t != "session" {
			newChannel.Reject(ssh.UnknownChannelType, "unknown channel type")
			continue
		}
		conn, reqs, err := newChannel.Accept()
		if err != nil {
			log.Printf("Could not accept channel (%s)", err)
			return
		}

		handleChannel(conn, reqs)
	}
}

func handleChannel(conn ssh.Channel, reqs <-chan *ssh.Request) {

	bash := exec.Command("bash")

	close := func() {
		conn.Close()
		_, err := bash.Process.Wait()
		if err != nil {
			log.Printf("Failed to exit bash (%s)", err)
		}
		log.Println("Session closed")
	}

	log.Println("creating pty...")
	bashf, err := pty.Start(bash)
	if err != nil {
		log.Printf("Could not start pty (%s)", err)
		return
	}

	go func() {
		for req := range reqs {
			log.Printf("newChanne request: %q", goon.Sdump(req))
			switch req.Type {

			case "shell":
				// We only accept the default shell (i.e. no command in the Payload)
				if len(req.Payload) == 0 {
					req.Reply(true, nil)
				}

			case "pty-req":
				termLen := req.Payload[3]
				w, h := parseDims(req.Payload[termLen+4:])
				SetWinsize(bashf.Fd(), w, h)
				req.Reply(true, nil)

			case "window-change":
				w, h := parseDims(req.Payload)
				SetWinsize(bashf.Fd(), w, h)
			}
		}
	}()

	var once sync.Once
	go func() {
		io.Copy(conn, bashf)
		once.Do(close)
	}()
	go func() {
		io.Copy(bashf, conn)
		once.Do(close)
	}()

}

// parseDims extracts terminal dimensions (width x height) from the provided buffer.
func parseDims(b []byte) (uint32, uint32) {
	w := binary.BigEndian.Uint32(b)
	h := binary.BigEndian.Uint32(b[4:])
	return w, h
}

// ======================

// Winsize stores the Height and Width of a terminal.
type Winsize struct {
	Height uint16
	Width  uint16
	x      uint16 // unused
	y      uint16 // unused
}

// SetWinsize sets the size of the given pty.
func SetWinsize(fd uintptr, w, h uint32) {
	ws := &Winsize{Width: uint16(w), Height: uint16(h)}
	syscall.Syscall(syscall.SYS_IOCTL, fd, uintptr(syscall.TIOCSWINSZ), uintptr(unsafe.Pointer(ws)))
}
