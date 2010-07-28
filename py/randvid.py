#!/usr/bin/env python

import os, sys
from fnmatch import fnmatch
from random import choice


if __name__ == '__main__':
	startdir = os.curdir
	if len(sys.argv) > 1: startdir = sys.argv[1]

	try:
		vids = [curp+"/"+f for (curp, dirs, files) in os.walk(startdir)
					for f in files
					if not curp.endswith('.AppleDouble') # meh..
					if fnmatch(f, '*.avi') or fnmatch(f,'*.mp4') or fnmatch(f,'*.wmv')]
		print(choice(vids))
	except IndexError:
		print("/dev/null")



