PREFIX = ${HOME}

sh:
	@echo installing sh scripts into ${PREFIX}/bin
	@mkdir -p ${PREFIX}/bin
	@cp -f sh/{terMenu.sh,dwmstatus.sh,lscwd.sh} ${PREFIX}/bin
	@chmod 755 ${PREFIX}/bin/terMenu.sh
	@chmod 755 ${PREFIX}/bin/dwmstatus.sh
	@chmod 755 ${PREFIX}/bin/lscwd.sh

install: sh
	
.PHONY: install sh
