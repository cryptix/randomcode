#include <stdio.h>
#include <limits.h>
#include <err.h>
#include <unistd.h>
#include <sys/select.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <fcntl.h>

int main(int argc, char **argv) {
	int gate, pmos;
	char buf[65536];
	fd_set fds;
	ssize_t size;
	struct stat statbuf;
	char *filename;

	if(argc != 2) errx(1, "Usage: %s [-]gate", argv[0]);

	pmos = (*argv[1] == '-');
	filename = argv[1] + pmos;

	if((gate = open(filename, O_RDWR)) < 0) err(1, "%s", filename);
	if(fstat(gate, &statbuf) < 0) err(1, "stat: %s", filename);
	if(!S_ISFIFO(statbuf.st_mode)) errx(1, "%s: ceci n'est pas une pipe", filename);

	for(;;) {
		FD_ZERO(&fds);
		FD_SET(gate, &fds);
		if(select(gate + 1, (pmos? &fds : 0), (pmos? 0 : &fds), 0, 0) < 0) err(1, "select");
		if(FD_ISSET(gate, &fds)) {
			if((size = read(0, buf, sizeof(buf))) < 0) err(1, "read");
			if((size = write(1, buf, size)) < 0) err(1, "write");
			usleep(20000);
		}
	}
}