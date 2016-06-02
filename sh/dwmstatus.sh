#!/bin/sh

while true;
do
  _date=$(date "+%d.%b %H:%M")

  _load=$(sysctl vm.loadavg)

  # xsetroot -name "load[$_load] free[${_mem}m] date[$_date]"
  echo "$_load date[$_date]"
  sleep 10
done
