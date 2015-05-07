package main

import (
	"bufio"
	"bytes"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"

	"github.com/cheggaaa/pb"
	"github.com/cryptix/go/logging"
)

func main() {
	var buf bytes.Buffer
	cmd := exec.Command("find", ".", "-iname", "*.wav")
	cmd.Stdout = &buf

	logging.CheckFatal(cmd.Run())

	wavs := buf.String()
	total := len(strings.Split(wavs, "\n")) - 1
	wmaScanner := bufio.NewScanner(strings.NewReader(wavs))

	var wg sync.WaitGroup
	jobs := make(chan string)
	for i := 0; i < runtime.NumCPU(); i++ {
		wg.Add(1)
		go worker(jobs, &wg)
	}

	bar := pb.StartNew(total)
	for wmaScanner.Scan() {
		jobs <- fname
		bar.Increment()
	}

	logging.CheckFatal(wmaScanner.Err())
	close(jobs)

	wg.Wait()
	bar.Finish()
}

func worker(jobs <-chan string, wg *sync.WaitGroup) {
	for job := range jobs {
		fmt.Println("Encoding", job)
		dir, file := filepath.Split(job)
		cmd := exec.Command("ffmpeg", "-i", file, "acodec", "aac", "-b:a", "192k", strings.Replace(file, ".wav", ".m4a", 1))
		cmd.Dir = dir

		_, err := cmd.CombinedOutput()
		// fmt.Print(string(out))
		logging.CheckFatal(err)
		logging.CheckFatal(os.Remove(job))
	}
	wg.Done()
}
