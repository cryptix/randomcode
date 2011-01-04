#!/bin/sh

id=$(lsurf | dmenu -l 5)

[ "$id" == "" ] && surf
[ "$id" != "" ] && surfact.sh $(echo $id | cut -d":" -f1) _SURF_URI
