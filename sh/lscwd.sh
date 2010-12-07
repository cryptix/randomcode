#!/bin/sh
#print the working directorys of all zsh instances

for pid in `pidof zsh`
do
	stat /proc/$pid/cwd 2>/dev/null| awk -F'`' '/File/{print $3}' | tr -d \'
done | sort -u
