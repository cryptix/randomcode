#!/bin/sh

gpart delete -i 1 ada0
gpart delete -i 2 ada0
gpart delete -i 1 ada1

gpart destroy ada0
gpart destroy ada1
echo "Deleted parts"

gpart create -s gpt ada0
gpart add -b 34 -s 94 -t freebsd-boot ada0
gpart add -t freebsd-zfs -l raptor ada0
gpart bootcode -b /boot/pmbr -p /boot/gptzfsboot -i 1 ada0

gpart create -s gpt ada1
gpart add -t freebsd-zfs -l exstor ada0
echo "Created parts"

