#!/bin/sh

id=$(lsurf | dmenu -l 5)

[ "$id" == "" ] && exec surf
[ "$id" != "" ] && surfact.sh $(echo $id | cut -d":" -f1) _SURF_URI
