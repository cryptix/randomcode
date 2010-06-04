#!/usr/bin/env python
import sys, os
from getopt  import getopt
from fnmatch import fnmatch

opts, args = getopt(sys.argv[1:], 'oq', ['sl=', 'rep='])

slicenr = -1
replacestr = ''
overide = False
quite = True

if len(sys.argv) < 2:
	print 'Usage: %s --sl <sliceToSplit> --rep <stringToReplace>' % sys.argv[0]
	sys.exit(1)

# option/argument handling
if ('-q', '') in opts:
	quite = False

for o, v in opts:
	if o == '--sl':
		slicenr = int(v)
		if quite: print '[+] slice number:', v
	if o == '--rep':
		replacestr = v
		if quite: print '[+] replace string:', v
	if o == '-o':
		overide = True
		if quite: print '[+] go on anyway'


assert slicenr > 0, 'Slicenumber must be valid'


if args == []:
	old = [f 
		for f in os.listdir('.')
		if fnmatch(f, '*.avi')]
else:
	old = [f 
		for f in os.listdir('.')
		if fnmatch(f, args)]

if replacestr == '':
	new = [f.split('.')[slicenr].lower() + '.avi'
			for f in old]
else:
	new = [f.split('.')[slicenr].lower().replace(replacestr, '') + '.avi'
			for f in old]

if quite:
	for o, n in zip(old, new): print o, ">", n
		
if overide == True or raw_input('Sure?') in ['y', 'Y']:
	map(os.rename, old, new)
