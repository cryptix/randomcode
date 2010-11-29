PREFIX = ${HOME}

sh:
	@echo installing sh scripts into ${PREFIX}/bin
	@mkdir -p ${PREFIX}/bin
	@cp -f sh/{surfmenu.sh,surfdl.sh,dwmstatus.sh} ${PREFIX}/bin
	@chmod 755 ${PREFIX}/bin/surfmenu.sh
	@chmod 755 ${PREFIX}/bin/surfdl.sh
	@chmod 755 ${PREFIX}/bin/dwmstatus.sh

install: sh
	
.PHONY: install sh
