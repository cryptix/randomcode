#!/bin/bash

hashfile=./hashes.txt

if [ ! -f $hashfile ]; then
	touch $hashfile
fi

find . -name '*.mp3' | while read fname
do
	bname=$(basename $fname)
	md5sum=$(echo $bname | md5)

	grep -q $md5sum $hashfile

	if [ $? -eq 1 ]; then
		echo "uniqe file $fname" 
		echo $md5sum >> $hashfile
	else
		echo "duplicate! $fname"
		#rm "$fname"
	fi

done