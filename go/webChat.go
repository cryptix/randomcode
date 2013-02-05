package main

import (
	"code.google.com/p/go.net/websocket"
	"fmt"
	"html/template"
	"io"
	"log"
	"net/http"
)
https://gist.github.com/4699109
var rootTemplate = template.Must(template.New("root").Parse(`
<!DOCTYPE html>
<html>
	<head>
		<meta charset="utf-8"/>
		<script type="text/javascript">
			var nick = prompt("Your nick name?");

			function onMessage(m) {
				var ul = document.getElementById("msgList");
				var li = document.createElement("li");
				li.innerHTML = m.data;
				ul.appendChild(li);
			}

			function onClose(m) {
				var status = document.getElementById("status");
				status.innerHTML = "Connection closed!";
				//console.dir(m);

				var ul = document.getElementById("msgList");
				var msgs = ul.childNodes
				for (var i = msgs.length - 1; i >= 0; i--) {
					var a = msgs[i];
					a.remove();
				};
			}

			function sendMsg(evt) {
				if(evt.keyCode === 13) {
					var msg = document.getElementById("txtBox");
					websocket.send(nick + ":" + msg.value);
					msg.value = "";
					return false;
				}
			}

			var websocket = new WebSocket("ws://{{.}}/socket");
			websocket.onmessage = onMessage;
			websocket.onclose = onClose;
		</script>
	</head>
	<body>
		<div class="wrapper">
			<div class="containerInput">
				<input id="txtBox" type="text"  onkeypress="return sendMsg(event)">
			</div>
			<div class="containerMsgs">
				<p id="status"></p>
				<ul id="msgList">
					
				</ul>
			</div>
		</div>
	</body>
</html>
`))

func rootHandler(w http.ResponseWriter, r *http.Request) {
	rootTemplate.Execute(w, listenAddr)
}

type socket struct {
	io.ReadWrite // struct embedding! everything here must confirm to a io.ReadWriter (like ws!)
	done         chan bool
}

// with this one, type socket confirms to io.readwritecloser !
func (s socket) Close() error {
	s.done <- true
	return nil
}

func socketHandler(ws *websocket.Conn) {
	defer ws.Close() // http://adventuresingoland.blogspot.de/2011/04/prevent-memory-leaks-when-using.html#links
	s := socket{ws, make(chan bool)}
	go match(s)
	<-s.done
}

var partner = make(chan io.ReadWriteCloser)

func match(c io.ReadWriteCloser) {
	fmt.Fprint(c, "Waiting for a partner....")
	select {
	case partner <- c:
		// now handled by the other goroutine
	case p := <-partner:
		chat(p, c)
	}
}

func chat(a, b io.ReadWriteCloser) {
	fmt.Fprintln(a, "Found one! Say Hi!")
	fmt.Fprintln(b, "Found one! Say Hi!")
	errc := make(chan error, 1)
	go myCopy(a, b, errc)
	go myCopy(b, a, errc)
	if err := <-errc; err != nil {
		log.Println(err)
	}
	a.Close()
	b.Close()
}

func myCopy(w io.Writer, r io.Reader, errc chan<- error) {
	_, err := io.Copy(w, r)
	errc <- err
}

const listenAddr = "localhost:4000"

func main() {
	http.HandleFunc("/", rootHandler)
	http.Handle("/socket", websocket.Handler(socketHandler))
	err := http.ListenAndServe("localhost:4000", nil)
	if err != nil {
		log.Fatal(err)
	}
}
