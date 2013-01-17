#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <errno.h>
#include <err.h>
#include <limits.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <termios.h>
#include <unistd.h>
#include <fcntl.h>
#include <signal.h>

#define NORMAL	"\033[0m"
#define INVERSE	"\033[7m"

struct widget {
	char		*label;
	int		fd;
	int		button, on;
} *widgets;
int nwidgets, cursor, nbuttons;

void initwidget(struct widget *w, char *arg) {
	if(arg[0] == '-') {
		w->label = arg + 1;
		if((w->fd = open(w->label, O_RDWR | O_NONBLOCK)) < 0) err(1, "%s", w->label);
		w->button = ++nbuttons;
	} else {
		w->label = arg;
		if((w->fd = open(w->label, O_RDWR)) < 0) err(1, "%s", w->label);
	}
}

void display(struct widget *w, int focus) {
	if(w->button) {
		printf("%c%s%s%s%c ", focus? '[' : ' ', w->on? INVERSE : NORMAL, w->label, NORMAL, focus? ']' : ' ');
	} else {
		printf("(%s%s%s) ", w->on? INVERSE : NORMAL, w->label, NORMAL);
	}
}

void ttyinit(int dummy) {
	struct termios tio;

	if(tcgetattr(0, &tio) < 0) err(1, "tcgetattr");
	tio.c_lflag &= ~(ICANON | ECHO);
	tcsetattr(0, TCSANOW, &tio);
}

void ttyrestore() {
	struct termios tio;

	if(tcgetattr(0, &tio) < 0) err(1, "tcgetattr");
	tio.c_lflag |= ICANON | ECHO;
	tcsetattr(0, TCSANOW, &tio);
}

int main(int argc, char **argv) {
	int i, max;
	char ch;
	struct sigaction sa;
	fd_set rfds, wfds;
	char buf[65536];

	nwidgets = argc - 1;
	widgets = calloc(nwidgets, sizeof(struct widget));
	for(i = 0; i < nwidgets; i++) initwidget(widgets + i, argv[i + 1]);

	atexit(ttyrestore);
	memset(&sa, 0, sizeof(sa));
	sa.sa_handler = ttyinit;
	sigaction(SIGCONT, &sa, 0);
	ttyinit(0);

	for(;;) {
		printf("\r");
		for(i = 0; i < nwidgets; i++) display(widgets + i, cursor == widgets[i].button - 1);
		fflush(stdout);

		usleep(20000);

		FD_ZERO(&rfds);
		FD_ZERO(&wfds);
		FD_SET(0, &rfds);
		max = 0;
		for(i = 0; i < nwidgets; i++) {
			if(widgets[i].on) {
				FD_SET(widgets[i].fd, &rfds);
			} else {
				FD_SET(widgets[i].fd, &wfds);
			}
			if(widgets[i].fd > max) max = widgets[i].fd;
		}

		if(select(max + 1, &rfds, &wfds, 0, 0) < 0) {
			if(errno == EINTR) continue;
			err(1, "select");
		}

		for(i = 0; i < nwidgets; i++) {
			if(FD_ISSET(widgets[i].fd, &rfds)) {
				if(widgets[i].button) {
					read(widgets[i].fd, buf, sizeof(buf));
				} else {
					widgets[i].on = 0;
				}
			} else if(FD_ISSET(widgets[i].fd, &wfds)) {
				if(widgets[i].button) {
					memset(buf, 0, sizeof(buf));
					write(widgets[i].fd, buf, sizeof(buf));
				} else {
					widgets[i].on = 1;
				}
			}
		}
	
		if(FD_ISSET(0, &rfds)) {
			switch(read(0, &ch, 1)) {
				case 0:
					printf("\n");
					return 0;
				case 1:
					break;
				default:
					if(errno == EINTR) continue;
					err(1, "stdin");
			}
			switch(ch) {
				case 'h':
				case 'D':
					if(cursor) cursor--;
					break;
				case 'l':
				case 'C':
					if(cursor < nbuttons - 1) cursor++;
					break;
				case ' ':
					for(i = 0; i < nwidgets; i++) {
						if(cursor == widgets[i].button - 1) widgets[i].on ^= 1;
					}
					break;
				case 'q':
					printf("\n");
					return 0;
			}
		}
	}
}
