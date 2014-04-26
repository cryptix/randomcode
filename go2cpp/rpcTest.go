package main

import (
	"fmt"
	"io"
	"net/rpc"
	"net/rpc/jsonrpc"
	"os"
	"os/exec"
)

const cmdPath = "/Users/cryptix/Documents/DST-Swiss/TIS/Cpp/JsonRunner/Debug/JsonRunner"

type MoveToArgs struct {
	Y, Z        float64
	Alpha, Beta float64
}

type ScanJobArgs struct {
	FileName string
	JobNo    int
}

type stdioConn struct {
	stdout io.ReadCloser
	stdin  io.WriteCloser
}

func (s stdioConn) Close() (err error) {
	err = s.stdin.Close()
	if err != nil {
		return err
	}
	err = s.stdout.Close()
	if err != nil {
		return err
	}

	return nil
}

func (s stdioConn) Read(p []byte) (n int, err error) {
	n, err = s.stdout.Read(p)
	fmt.Printf("Reading from stdout:%s", string(p))
	return
}

func (s stdioConn) Write(p []byte) (n int, err error) {
	fmt.Printf("Writing to stdin:%s", string(p))
	return s.stdin.Write(p)
}

func main() {
	var (
		err     error
		running bool
	)

	cmd := exec.Command(cmdPath)

	stdout, err := cmd.StdoutPipe()
	checkErr(err)

	stderr, err := cmd.StderrPipe()
	checkErr(err)

	stdin, err := cmd.StdinPipe()
	checkErr(err)

	running = true
	go func() {
		err = cmd.Start()
		checkErr(err)

		err = cmd.Wait()
		checkErr(err)
		running = false
	}()

	// debug loop, copy stderr from cmd to this stderr
	go func() {
		for running {
			io.Copy(os.Stderr, stderr)
		}
	}()

	conn := stdioConn{stdout, stdin}
	rpcCodec := jsonrpc.NewClientCodec(conn)

	client := rpc.NewClientWithCodec(rpcCodec)

	mtArg := MoveToArgs{10, 20, 0.5, -0.25}
	var reply interface{}

	err = client.Call("MoveTo", mtArg, &reply)
	checkErr(err)
	fmt.Println("MoveTo Reply:", reply)

	sjArg := ScanJobArgs{"scan1.xyz", 501}
	err = client.Call("ScanJob", sjArg, &reply)
	checkErr(err)
	fmt.Println("ScanJob Reply:", reply)
}

func checkErr(err error) {
	if err != nil {
		panic(err)
	}
}
