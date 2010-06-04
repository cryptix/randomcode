#!/usr/bin/env sh
#netbook version

while true;
do
    _date=$(date +"%a. %H:%M")
    _load=$(cat /proc/loadavg | cut -d' ' -f1-2)
    _mem=$(free -m | grep 'Mem:' | cut -d' ' -f20)
	_bat=$(acpitool | awk '/Battery #1/{cd=$4; perc=$5; time=$6} END{ if(cd == "discharging,") printf("-] %s left",substr(time,0,5)); else printf("+] %s full",perc) }')

	#echo "[$_load] [$_mem] [$_date]"
		xsetroot -name "perf[$_load ${_mem}m] time[$_date] bat[$_bat]"
	sleep 15
done
