#!/bin/sh
#
# See README for usage.

bmarks=~/.surf/bmarks
dmenu="dmenu -nb #181818 -nf #e9e9e9 -sb #181818 -sf #dd6003 -fn -*-terminus-medium-r-normal-*-14-*-*-*-*-*-*-*"
xid=$1
p=$2
uri=`sprop $xid _SURF_URI`
kw=`sprop $xid _SURF_FIND`


echo "xid:$xid"

s_sprop() {
	[ -n "$2" ] && sprop $xid $1 "$2"
}

case "$p" in
"_SURF_FIND")
	ret="`echo $kw | $dmenu -p find:`"
	s_sprop _SURF_FIND "$ret"
	;;
"_SURF_BMARK")
	grep "$uri" $bmarks >/dev/null 2>&1 || echo "$uri" >> $bmarks
	;;
"_SURF_URI_RAW")
	ret=`echo $uri | $dmenu -p "uri:"`
	s_sprop _SURF_GO "$ret"
	;;
"_SURF_URI")
	sel=`cat $bmarks | $dmenu -p "uri [gtw*]:"`
	[ -z "$sel" ] && exit
	opt=`echo $sel | cut -d ' ' -f 1`
	arg=`echo $sel | cut -d ' ' -f 2-`
	case "$opt" in
	"g")
		ret="http://www.google.com/search?q=$arg"
		;;
	"t")
		ret="http://tinyurl.com/create.php?url=$uri"
		;;
	"w")
		ret="http://wikipedia.org/wiki/$arg"
		;;
	*)
		ret="$sel"
		;;
	esac
	s_sprop _SURF_GO "$ret"
	;;
*)
	echo Unknown xprop
	;;
esac
