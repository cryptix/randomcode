#!/bin/bash
#
#Convert .m4a to .mp3

function spaces2under {
	for i in *
	do
		mv "$i" $(echo $i | sed 's/ /_/g')
	done
}

function step1 {
	for i in *.m4a
	do
		mplayer -vc null -vo null -ao pcm:fast:file="$i.wav" $i

	done
}

function step2 {
	for i in *.wav
	do
		lame -h -b 192 "$i" "$i.mp3"
	done
}

function step3 {
	for i in *.mp3
	do
		x=$(echo "$i" | sed -e 's/m4a.wav.mp3/mp3/')
		mv "$i" "$x"
	done
}


