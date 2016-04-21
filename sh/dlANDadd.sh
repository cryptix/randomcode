#!/bin/bash
set -e

link=$1
ssbReplyID="%AtJIWxiswmhGUJWGRTHltmIBkScyQm4z8wTtvITj6Bs=.sha256"
dir=$(mktemp -d)

echo "tmpDir: $dir"

cd $dir && youtube-dl $1 \
	-o "%(title)s [%(id)s-%(autonumber)s].%(ext)s" \
	--restrict-filenames  \
	--hls-prefer-native \
	--external-downloader curl \
	--prefer-free-formats \
	-k \
	--write-info-json \
	--write-pages \
	--abort-on-error \
	--no-color \
	2>&1 | tee ytdl.log

ipfsHash=$(ipfs add -q -s rabin -r . | tail -n 1)
echo added as this:$link here:$ipfsHash
sbot publish --type post --root "$ssbReplyID" --branch "$ssbReplyID" --text "dlArchive: saved [$link]($link) to [ipfs](https://ipfs.io/ipfs/$ipfsHash)"
rm -rf $dir
