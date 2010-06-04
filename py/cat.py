#!/usr/bin/env python

def printFile(name):
    print("%s:" % name)
    nr = 1
    for line in open(name).readlines():
        print("%d:\t%s" % (nr, line.rstrip()))
        nr += 1


if __name__ == "__main__":
    from sys import argv, exit
    if len(argv) < 2:
        print("usage: %s <file>" % argv[0])
        exit(1)

    printFile(argv[1])
