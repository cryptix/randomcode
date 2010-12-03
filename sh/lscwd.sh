#!/bin/sh
#print the working directorys of all zsh instances

for pid in `pidof zsh`
do
	stat /proc/$pid/cwd | awk -F'>' '/File/{print $2}' | tr -d \` | tr -d \'
done | sort -u
