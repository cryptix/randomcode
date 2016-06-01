paramDir=/sys/module/zfs/parameters/
echo 1 > $paramDir/l2arc_nocompress
echo 0 > $paramDir/l2arc_noprefetch
echo 8388608 > $paramDir/l2arc_write_max
echo 134217728 > $paramDir/l2arc_write_boost

