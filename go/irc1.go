package main

import (
	"fmt"
	irc "github.com/fluffle/goirc/client"
	"math/rand"
	"os"
	"strings"
	"time"
)

const (
	ircChan = "#chaosAgDebug"
	ircNick = "cryBot"
)

// globals
var mchain *Chain = NewChain(2) // Initialize a new markov chain.

// Prefix is a Markov chain prefix of one or more words.
type Prefix []string

// String returns the Prefix as a string (for use as a map key).
func (p Prefix) String() string {
	return strings.Join(p, " ")
}

// Shift removes the first word from the Prefix and appends the given word.
func (p Prefix) Shift(word string) {
	copy(p, p[1:])
	p[len(p)-1] = word
}

// Chain contains a map ("chain") of prefixes to a list of suffixes.
// A prefix is a string of prefixLen words joined with spaces.
// A suffix is a single word. A prefix can have multiple suffixes.
type Chain struct {
	chain     map[string][]string
	prefixLen int
}

// NewChain returns a new Chain with prefixes of prefixLen words.
func NewChain(prefixLen int) *Chain {
	return &Chain{make(map[string][]string), prefixLen}
}

// Build reads text from the provided Reader and
// parses it into prefixes and suffixes that are stored in Chain.
func (c *Chain) Build(r []string) {
	fmt.Printf("<mchain> Adding '%v'\n", r)
	p := make(Prefix, c.prefixLen)
	for _, s := range r {
		key := p.String()
		c.chain[key] = append(c.chain[key], s)
		p.Shift(s)
	}
}

// Generate returns a string of at most n words generated from Chain.
func (c *Chain) Generate(n int) string {
	p := make(Prefix, c.prefixLen)
	var words []string
	for i := 0; i < n; i++ {
		choices := c.chain[p.String()]
		if len(choices) == 0 {
			break
		}
		next := choices[rand.Intn(len(choices))]
		words = append(words, next)
		p.Shift(next)
	}
	return strings.Join(words, " ")
}

func (c *Chain) PrintChain() {
	fmt.Printf("%#v\n", c.chain)
}

//
// event handlers
func handleConntected(conn *irc.Conn, line *irc.Line) {
	conn.Join(ircChan)
}

func handleDisconnected(q chan bool) irc.IRCHandler {
	// we need to get the channel in here
	return func(conn *irc.Conn, line *irc.Line) {
		// todo reconnect!
		fmt.Printf("Connection closed!")
		q <- true
	}
}

func handlePrivMsg(conn *irc.Conn, line *irc.Line) {
	// line.Raw = raw irc line
	// line.Cmd = PRIVMSG
	// line.Src = nick!ident

	fields := strings.Fields(line.Args[1])
	switch line.Args[0] {
	case ircChan: // msg from channel
		fmt.Printf("<chanMsg> %v: %v\n", line.Nick, fields)
		mchain.Build(fields)
	case ircNick: // privmsg to me
		fmt.Printf("<privMsg> %v: %v\n", line.Nick, fields)
		switch fields[0] { // command parsing
		case ".raw":
			if isAdmin(line.Src) {
				var rawcmd string = strings.Join(fields[1:], " ")
				fmt.Printf("<.RAW>'%v'\n", rawcmd)
				conn.Raw(rawcmd)
			}
		case ".say":
			conn.Privmsg(ircChan, mchain.Generate(10))

		case ".printChain":
			if isAdmin(line.Src) {
				mchain.PrintChain()
			}
		}
	default:
		fmt.Fprintf(os.Stderr, "<debug>\t<%v>\t%v\n%v\n", line.Src, line.Args, line.Raw)
	}
}

// bot helpers
func isAdmin(source string) bool {
	admins := []string{"cryptix!~cryptix@zulu1561.server4you.de", "keks!~keks@134.102.3.25"}
	for _, a := range admins {
		if a == source {
			return true
		}
	}
	return false
}

func main() {

	rand.Seed(time.Now().UnixNano()) // Seed the random number generator.

	// init irc connection
	c := irc.SimpleClient(ircNick)
	c.EnableStateTracking()

	// hackint cert fail.. :< todo: ignore?
	c.SSL = false

	c.AddHandler("connected", handleConntected)

	// And a signal on disconnect
	quit := make(chan bool)
	c.AddHandler("disconnected", handleDisconnected(quit))

	c.AddHandler("PrivMsg", handlePrivMsg)

	// Tell client to connect
	if err := c.Connect("irc.hackint.org"); err != nil {
		fmt.Printf("Connection error: %s\n", err)
	}

	// Wait for disconnect
	<-quit
}
