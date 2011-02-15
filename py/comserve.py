from select import select
import threading
import socket
import serial

def getListener(port):
	s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
	s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
	s.bind(('127.0.0.1', port))
	s.listen(1)
	return s

class ComStatus(threading.Thread):
	def __init__(self, sock, serial, log=None):
		super(ComStatus, self).__init__()
		self.name = "Command Interpreter"
		self.daemon = False
		self.log = log
		
		self.sock = sock
		self.serial = serial
		
		self.vid = False
		self.pid = False
	
	def run(self):
		self.alive = True
		"handle control comands"
		while self.alive:
			try:
				data = self.sock.recv(1024)
				if not data: break
				data = data.splitlines()[0]
				self.log.write("DEBUG:[%s]\n" % data)
				words = data.split(' ')
				if words[0] == "open":
					if self.vid and self.pid:
						# TODO find port by vid/pid?
						self.serial.open()
						self.sock.send("ok\n")
					else:
						self.sock.send("vid and pid first\n")
				elif words[0] == "setvid":
					self.vid = int(words[1])
				elif words[0] == "setpid":
					self.pid = int(words[1])
				else:
					 self.sock.send("unknown command\n")

			except socket.error, msg:
				sys.stderr.write("ERROR: %s\n" % msg) # disconnected?
				break
		self.alive = False
				
	
	def stop(self):
		if self.alive: self.alive = False

class ComBridge(threading.Thread):
	def __init__(self, sock, serial, log=None):
		super(ComBridge, self).__init__()
		self.name = "8001<>Serial Bridge"
		self.daemon = False
		self.log = log
		
		self.sock = sock
		self.serial = serial
	
	def run(self):
		"copy stuff from and to serial"
		self.alive = True
		while self.alive:
			try:
				irdy, ordy, xrdy = select([self.serial, self.sock],[],[])
				for s in irdy:
					if s == self.serial:
						data = self.serial.read(1)              # read one, blocking
						n = self.serial.inWaiting()             # look if there is more
						if n:
							data = data + self.serial.read(n)   # and get as much as possible
						if data:
							self.sock.send(data)           # send it over TCP
					elif s == self.sock:
						data = self.sock.recv(1024)
						if not data: break
						self.serial.write(data)
					else:
						if self.log:
							self.log.write("Who is it??")
							self.log.write(s)
			except socket.error, msg:
				sys.stderr.write("ERROR: %s\n" % msg) # disconnected?
				break
			except serial.portNotOpenError, msg:
				sys.stderr.write("Serial not open yet: %s\n" % msg)
				pass

	def stop(self):
		if self.alive: self.alive = False
	

class ComServer:
	def __init__(self, log):
		self.log = log
		
		# Serial
		self.serial = serial.Serial()
		self.serial.port = '/dev/cu.PL2303-00002006'
		self.serial.baudrate = 115200
		self.serial.timeout = 1
		
		# Sockets
		self.sLBridge = getListener(8001)
		self.sLStatus = getListener(8002)
		self.sLDataB  = getListener(8003)
	
	def serve(self):
		socks = [self.sLBridge, self.sLStatus, self.sLDataB]
		clients = []
		threads = []
		while True:
			try:
				print(clients)
				irdy, ordy, xrdy = select(socks,[],[c[0] for c in clients])
        
				for s in irdy:
					if s == self.sLStatus: # dispatch command line
						client, addr = s.accept()
						clients.append((client, s.getsockname()[1]))
						self.log.write('Command Connection from %s...\n' % (addr, ))
						self.sStatus = ComStatus(client, self.serial, self.log)
						self.sStatus.start()
						threads.append(self.sStatus)

						# no longer listen 
						s.close()
						socks.remove(s)
						
					elif s == self.sLBridge: # accept bridge sockets when serial is open
						client, addr = s.accept()
						clients.append((client, s.getsockname()[1]))
						self.log.write('Bridge Connection from %s...\n' % (addr, ))
						self.sBridge = ComBridge(client, self.serial, self.log)
						self.sBridge.start()
						threads.append(self.sBridge)
						
						# no longer listen 
						s.close()
						socks.remove(s)
					elif s == self.sLDataB: # accept database connection and forget about them (for now)
						client, addr = s.accept()
						clients.append((client, s.getsockname()[1]))
						self.log.write('Database connection from %s...\n' % (addr, ))

						s.close()
						socks.remove(s)
					else:
						self.log.write("How did we get here?")
						self.log.write(s)

				for s in xrdy: # handle closed sockets?
					print(s)
					sock = s[0]
					port = s[1]

					sock.close()
					if port == 8001:
						self.sLBridge = getListener(port)
						socks.append(self.sLBridge)
					elif port == 8002:
						self.sLStatus = getListener(port)
						socks.append(self.sLStatus)
					elif port == 8003:
						self.sLDataB  = getListener(8003)
						socks.append(self.sLDataB)

			except socket.error, msg:
				self.log.write('Error %s\n' % msg)
				break

		for t in threads: t.join() # wait for threads to exit

if __name__ == "__main__":
	from sys import stderr
	c = ComServer(log=stderr)
	c.serve()
