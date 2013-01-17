#!/bin/sh
#netbook version

while true;
do
  _date=$(date "+%d.%b %H:%M")

  _load=$(cat /proc/loadavg | cut -d' ' -f1-2)

  _mem=$(awk '/^Cached/{total -= $2}
              /MemFree/{total += $2}
              END {
                end = total<0 ? -total : total;
                printf("%.0f\n",end/1024)
              }' /proc/meminfo)

# _bat=`acpitool | awk '/Battery #1/{cd=$4; perc=$5; time=$6} END {
#     if(cd == "discharging,")
#       printf("-] %s left",substr(time,0,5))
#     else {
#       sub("%,","%",perc);
#         printf("+] %s full",perc) 
#     }
#   } '`

  xsetroot -name "load[$_load] free[${_mem}m] date[$_date]"
  sleep 10
done
