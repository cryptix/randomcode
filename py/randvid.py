#!/usr/bin/env python

import os, sys
from fnmatch import fnmatch
from random import choice

def fnwrap(f, args):
	return [fnmatch(f,arg) for arg in args]

if __name__ == '__main__':
	startdir = os.curdir if len(sys.argv) < 2 else sys.argv[1]

	try:
		vids = [curp+"/"+f for (curp, dirs, files) in os.walk(startdir)
					for f in files
					if not curp.endswith('.AppleDouble') # meh..
					if True in fnwrap(f, ['*.avi','*.mp4','*.wmv'])] #refactor to map

		print(choice(vids))
	except IndexError:
		print("/dev/null")



