#!/bin/sh

zpool create -o altroot=/mnt -o cachefile=/var/tmp/zpool.cache zroot /dev/gpt/raptor
echo "created zroot"

gnop create -S 4096 /dev/gpt/exstor
zpool create -o altroot=/mnt -o cachefile=/var/tmp/zpool.cache zdata /dev/gpt/exstor.nop
zpool export zdata
gnop destroy /dev/gpt/exstor.nop
zpool import -o altroot=/mnt/usr -o cachefile=/var/tmp/zpool.cache zdata
echo "created zdata"


zpool set bootfs=zroot zroot
zfs set checksum=fletcher4 zroot
zfs set checksum=fletcher4 zdata