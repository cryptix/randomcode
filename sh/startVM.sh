#!/usr/bin/env bash


##
# Isos
##

# /mnt/play/Downloads/mu_visual_studio_2010_sp1_x86_dvd_651704.iso
# /mnt/play/virtio-win-0.1-74.iso
# /mnt/play/isos/kali-linux-1.0.6-amd64/kali-linux-1.0.6-amd64.iso

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
8) Linux - CentOS
9) FreeBSD 10
10) Docker1
EOF

read vmSel

# configure defaults
ram=$((4*1024))
rootDrive=/dev/null
extraArgs=""
netConfig="-net nic,model=virtio -net bridge,br=br0"

case $vmSel in
	1)
		rootDrive=/dev/zvol/zdata/Win7DST
		# extraMedia="-drive file=/mnt/play/Downloads/mu_visual_studio_2010_sp1_x86_dvd_651704.iso,media=cdrom"
		;;
	
	2)
		rootDrive=/dev/zvol/zdata/Win7Xilinx
		extraArgs="-usb -device usb-host,vendorid=0x1443,productid=0x0007"
		;;

	3)
		rootDrive=/dev/zvol/zdata/Win7
		extraArgs="-usb -device usb-host,vendorid=0x4b9,productid=0x300"
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
		rootDrive=/dev/zvol/zdata/CentOSVM
		;;

	9)
		rootDrive=/dev/zvol/zdata/FreeBSD10
		;;

	10)
		rootDrive=/dev/zvol/zdata/DockerVM1
		extraMedia="-drive file=/mnt/play/boot2docker.iso,media=cdrom -boot d"
		;;
esac


guestArch=qemu-system-x86_64
if [[ $is32bit -eq 1 ]]; then
	echo "Running 32bit mode."
	guestArch=qemu-system-i386
fi
	

echo "Booting VM..."
exec $guestArch \
	-drive file=$rootDrive,cache=none,if=virtio \
	$extraMedia \
	-m $ram \
	-cpu host \
	-smp cores=2,threads=2 \
	-enable-kvm \
	$netConfig \
	-vga qxl \
	-spice port=5930,disable-ticketing \
	-device virtio-serial-pci \
	-device virtserialport,chardev=spicechannel0,name=com.redhat.spice.0 \
	-chardev spicevmc,id=spicechannel0,name=vdagent \
	$extraArgs