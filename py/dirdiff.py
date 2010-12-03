#!/usr/bin/env python
import sys, os
from filecmp import dircmp

def error():
	print 'usage: %s <dir1> <dir2> <s(hort)|p(partial)|f(ull)> ' % os.path.basename(sys.argv[0])
	sys.exit(1)

try:
	dir1, dir2, verbose = sys.argv[1:]
except ValueError:
	print 'We need 3 arguments'
	

if (not os.path.isdir(dir1)) or (not os.path.isdir(dir2)) or (not verbose in ['s','p','f']):
	error()

diff = dircmp(dir1, dir2)

if verbose == 's':
	diff.report()
elif verbose == 'p':
	diff.report_partial_closure()
elif verbose == 'f':
	diff.report_full_closure()
