#!/usr/bin/env python
from random import shuffle

def wierdspell(correct):
	"""this fucks up text"""
	
	lines = []
	for line in correct.splitlines():
		
		wrong = []
		for word in line.split(' '):
			if len(word) == 0: continue
			word = list(word)
			first, last = word[0], word[-1]
			mix = word[1:-1]
			shuffle(mix)
			wrong.append(first + ''.join(mix) + last)
		
		lines.append(' '.join(wrong))
	
	return '\n'.join(lines)


if __name__ == "__main__":
	from sys import stdin, stdout
	
	inp = stdin.read()
	outp = wierdspell(inp)
	stdout.write(outp)
	