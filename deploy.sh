rmNln() {
	fname=$(echo $1 | cut -d'/' -f2)
	loc=$(echo $1 | cut -d'/' -f1)
	test -f ~/bin/$fname && rm ~/bin/$fname
	ln -s ~/code/$loc/$fname ~/bin/$fname
}

rmNln sh/status.sh

#python
for f in py/{4chan-dd,randvid,wierdspell}.py
do
	rmNln $f
done