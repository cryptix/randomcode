#!/usr/bin/env python
from hashlib import md5
import itertools
import string

def permutations_withrep(iterable, n):
	for i in range(n):
		arg = [iterable for x in range(i)]
		yield (itertools.product(*arg), i)

if __name__ == '__main__':
	from sys import argv,exit
	if len(argv) != 2:
		print "Usage: %s <hash>" % argv[0]
		exit(1)
	
	for run, nr in permutations_withrep(string.printable,6):
		print "Length:", nr
		for guess in run:
			guess = ''.join(guess)
			if md5(guess).hexdigest() == argv[1]:
				print 'Found it:', guess
				break
