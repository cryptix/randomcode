#!/usr/bin/env python
# 4chan thread dumper
#
# If you want to download all pictures of a thread this does the trick
# its also threaded so be prepeard for a network burst


from BeautifulSoup import BeautifulSoup
from urllib2 import urlopen
from os import fstat
import re

def dumpPics(url):
	"""saves pictures (<img>) to curdir	"""
	try:
		html = urlopen(url).read()
		soup = BeautifulSoup(html)
		
		# set() to filter out doubles
		links = set([ "http://krautchan.net" + a['href'] for a in soup('a', href=re.compile('files/'))])
		
		for link in links:
			pic = urlopen(link)
			
			if pic.getcode() == 200:
					f = open(link.split('/')[-1] ,'w')
					if fstat(f.fileno()).st_size == 0: f.write(pic.read())
			print 'fetched: %s - %d' % (pic.geturl(), pic.getcode())
				
	except Exception, e:
		raise e
	else:
		print "all well done"

		
if __name__ == '__main__':
	import sys
	
	if len(sys.argv) != 2:
		print("usage: %s url" % sys.argv[0])
		sys.exit(1)
	
	dumpPics(sys.argv[1])
