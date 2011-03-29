#!/usr/bin/env python
# 4chan thread dumper
#
# If you want to download all pictures of a thread this does the trick
# its also threaded so be prepeard for a network burst


from BeautifulSoup import BeautifulSoup
from urllib.request import urlopen
from os import fstat
import threading
import re

class myDumper(threading.Thread):
	"""Saves URL to File - in a thread"""
	def __init__(self, url):
		super(myDumper, self).__init__()
		self.url = url
	
	def run(self):
		pic = urlopen(self.url)
		
		if pic.getcode() == 200:
				f = open(self.url.split('/')[-1] ,'w')
				if fstat(f.fileno()).st_size == 0: f.write(pic.read())
		print('fetched: {0} - {1}'.format(pic.geturl(), pic.getcode()))
	

def dumpPics(url):
	"""saves pictures (<img>) to curdir	"""
	try:
		html = urlopen(url).read()
		soup = BeautifulSoup(html)
		
		# set() to filter out doubles
		links = set([ a['href'] for a in soup('a', href=re.compile('http://images.4chan.org/'+ url.split('/')[3] + '/src/'))])
		
		threads = []
		for link in links: 
			thread = myDumper(link)
			thread.start()
			threads.append(thread)
		
		for thread in threads: thread.join() # wait for thread to exit
		
	except Exception as e:
		raise e
	else:
		print("all well done")

		
if __name__ == '__main__':
	import sys
	
	if len(sys.argv) != 2:
		print("usage: {0} url".format(sys.argv[0]))
		sys.exit(1)
	
	dumpPics(sys.argv[1])
