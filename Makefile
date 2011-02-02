PREFIX = ${HOME}

sh:
	@echo installing sh scripts into ${PREFIX}/bin
	@mkdir -p ${PREFIX}/bin
	@cp -f sh/{surfmenu.sh,surfact.sh,surfdl.sh,stmenu.sh,dwmstatus.sh,lscwd.sh} ${PREFIX}/bin
	@chmod 755 ${PREFIX}/bin/surfmenu.sh
	@chmod 755 ${PREFIX}/bin/surfact.sh
	@chmod 755 ${PREFIX}/bin/surfdl.sh
	@chmod 755 ${PREFIX}/bin/stmenu.sh
	@chmod 755 ${PREFIX}/bin/dwmstatus.sh
	@chmod 755 ${PREFIX}/bin/lscwd.sh

install: sh
	
.PHONY: install sh
