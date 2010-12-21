#!/bin/sh
#
# See README for usage.

bmarks=~/.surf/bmarks
xid=$1
p=$2
uri=`sprop $xid _SURF_URI`
kw=`sprop $xid _SURF_FIND`

s_sprop() {
	[ -n "$2" ] && sprop $xid $1 "$2"
}

case "$p" in
"_SURF_FIND")
	ret="`echo $kw | dmenu -p find:`"
	s_sprop _SURF_FIND "$ret"
	;;
"_SURF_BMARK")
	grep "$uri" $bmarks >/dev/null 2>&1 || echo "$uri" >> $bmarks
	;;
"_SURF_URI_RAW")
	ret=`echo $uri | dmenu -p "uri raw:"`
	s_sprop _SURF_GO "$ret"
	echo $ret | xsel -i
	;;
"_SURF_INFO")
	xprop -id $xid | sed 's/\t/    /g' | dmenu -l 10 -p "info[$xid]:"
	;;
"_SURF_URI")
	sel=`cat $bmarks | dmenu -l 5 -p "uri:"`
	[ -z "$sel" ] && exit
	opt=`echo $sel | cut -d ' ' -f 1`
	arg=`echo $sel | cut -d ' ' -f 2-`
	case "$opt" in
	"ende")
		ret="http://dict.leo.org/ende?search=$arg"
		;;
	"g")
		ret="http://www.google.com/search?q=$arg"
		;;
	"t")
		ret="http://tinyurl.com/create.php?url=$uri"
		;;
	"w")
		ret="http://wikipedia.org/wiki/$arg"
		;;
	"wa")
		ret="http://www.wolframalpha.com/input/?i=$arg"
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
