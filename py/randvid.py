#!/usr/bin/env python

import os, sys
from fnmatch import fnmatch
from random import choice

def fnwrap(f, args):
	return [fnmatch(f,arg) for arg in args]

if __name__ == '__main__':
	startdir = os.curdir if len(sys.argv) < 2 else sys.argv[1]
	cnt = 1 if len(sys.argv) < 3 else int(sys.argv[2])

	try:
		vids = [curp+"/"+f for (curp, dirs, files) in os.walk(startdir)
					for f in files
					if True in fnwrap(f, ['*.avi','*.mp4','*.wmv', '*.mkv'])] #refactor to map

		new = [ choice(vids) for i in range(0,cnt)]
		for f in set(new):
			print(f)

	except IndexError:
		print("/dev/null")


