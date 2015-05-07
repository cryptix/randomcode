#!/usr/bin/env bash


##
# Isos
##

# /home/cryptix/play/Downloads/mu_visual_studio_2010_sp1_x86_dvd_651704.iso
# /home/cryptix/play/isos/virtio-win-0.1-74.iso
# /home/cryptix/play/isos/kali-linux-1.0.6-amd64/kali-linux-1.0.6-amd64.iso
# /home/cryptix/play/isos/FreeBSD-10.1-RELEASE-amd64-memstick.img

is32bit=0

# print selection
cat << EOF
1) Win7 - DST
2) Win7 - Xilinx
3) Win7 - macBookVM Clone
4) Win8 - Hacked
5) WinXP - Testing
6) Linux - kali
7) Linux - Arch 32bit
8) Linux - Arch 64bit
9) Linux - sabotage
10) BSD  - FreeBSD 10.1
11) Win10 - Preview
EOF

read vmSel

# configure defaults
ram=$((4*1024))
rootDrive=/dev/null
extraArgs=""
cnt=$(pgrep qemu-system | wc -l)
spicePort=$(( 5930 + $cnt ))
switchPort=$(( 2 + $cnt ))
netConfig="-net nic,model=virtio,macaddr=52:54:00:de:ad:0$((2*switchPort)),vlan=0 -net vde,sock=/tmp/qemuNet.ctl,vlan=0,port=$switchPort"
#netConfig="-net nic,model=virtio -net bridge,br=br0"

case $vmSel in
	1)
		rootDrive=/dev/zvol/zdata/Win7DST
		extraArgs="-usb -device usb-host,vendorid=0x4b9,productid=0x300"
		# extraMedia="-drive file=/mnt/play/Downloads/mu_visual_studio_2010_sp1_x86_dvd_651704.iso,media=cdrom"
		;;

	2)
		rootDrive=/dev/zvol/zdata/Win7Xilinx
		extraArgs="-usb -device usb-host,vendorid=0x10c4,productid=0xea60 -device usb-host,vendorid=0x1443,productid=0x0007"
		;;

	3)
		rootDrive=/dev/zvol/zdata/Win7
		#extraArgs="-usb -device usb-host,vendorid=0x4b9,productid=0x300"
		#extraMedia="-drive file=/mnt/play/isos/virtio-win-0.1-74.iso,media=cdrom"
		;;

	4)
		rootDrive=/dev/zvol/zdata/Win81Test
		netConfig="-net none"
		;;

	5)
		rootDrive=/dev/zvol/zdata/WinXPTest
		;;

	6)
		rootDrive=/dev/zvol/zdata/LinuxKali
		;;

	7)
		rootDrive=/dev/zvol/zdata/LinuxArchi686
		is32bit=1
		;;

	8)
		rootDrive=/dev/zvol/zdata/LinuxArchx64
		#extraMedia="-drive file=/mnt/play/isos/archlinux-2014.04.01-dual.iso,media=cdrom"
		;;

	9)
		rootDrive=/dev/zvol/zdata/LinuxSabotage
		;;

	10)
		rootDrive=/dev/zvol/zdata/FreeBSD10.1
		#extraMedia="-drive file=/home/cryptix/play/isos/FreeBSD-10.1-RELEASE-amd64-bootonly.iso,media=cdrom -boot d"
		;;

	11)
		rootDrive=/dev/zvol/zdata/Win10Preview
		#extraMedia="-drive file=/home/cryptix/play/isos/Windows10_TechnicalPreview_x64_EN-GB_9926.iso,media=cdrom -boot d"
		extraArgs="-drive file=/home/cryptix/play/isos/virtio-win-0.1-74.iso,media=cdrom"
		;;
esac


guestArch=qemu-system-x86_64
if [[ $is32bit -eq 1 ]]; then
	echo "Running 32bit mode."
	guestArch=qemu-system-i386
fi


echo "Booting VM... Spicec Port: $spicePort"
$guestArch \
	-drive file=$rootDrive,cache=none,if=virtio \
	$extraMedia \
	-m $ram \
	-cpu host \
	-smp cores=2,threads=2 \
	-enable-kvm \
	$netConfig \
	-vga qxl \
	-spice port=$spicePort,disable-ticketing \
	-device virtio-serial-pci \
	-device virtserialport,chardev=spicechannel0,name=com.redhat.spice.0 \
	-chardev spicevmc,id=spicechannel0,name=vdagent \
	$extraArgs &
spicec -h localhost -p $spicePort
