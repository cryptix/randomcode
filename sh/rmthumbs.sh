#!/usr/bin/bash

IFS=$'\n'

find . -type f -name 'Thumbs.db' | while read filename
do
	rm $filename

done
