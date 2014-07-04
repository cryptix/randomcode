/*
helpers for converting data from the pshdl sim
into a VCD format understood by GTKWave

inspired by pig2vcd http://abyz.co.uk/rpi/pigpio/pig2vcd.html


TODO:
- compare signals to previous tick to reduce size of output
*/

#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <unistd.h>
#include <time.h>
#include <sys/time.h>
#include <stdint.h>

#include "utlist.h" // http://troydhanson.github.io/uthash/utlist.html


// declarations
#define NAMELEN 128


// list element of signals
typedef struct signal {
    int idx; // simulation index
    char symbol;
    char name[NAMELEN];
    size_t width;

    struct signal *next, *prev;
} signal;

// vcdWriter
typedef struct vcdWriter {
	FILE *fp; // file to write to

	int symbolCount; 	// number of signals tracked
	uint32_t tickCount; // tick counter

	signal *head; // list of signals to track
} vcdWriter;

// function declarations

// creates a new  vcd file (named fname)
// returns a pointer to a vcdWriter struct to use for further interaction
static vcdWriter* vcdCreateWriter(const char *fname);

// registers a signal onto the vcdWriter
// these are then polled on every vcdTick call
void vcdRegisterSignal(vcdWriter *w, const int idx,  const char* name, size_t width);

// writes the header, register your signals before
void vcdWriteHeader(vcdWriter *w);

// poll all registerd signals for their values
// and write them to file
void vcdTick(vcdWriter *w);

// close the output file
void vcdCloseWriter(vcdWriter *w);


// signature of getOutput function
uint64_t pshdl_sim_getOutput(int idx, ...);

// helpers
static char * timeStamp();
char * int2bin(uint64_t i, size_t bits);

// definitions
// ===========

static vcdWriter* vcdCreateWriter(const char *fname)
{
	vcdWriter *w = malloc(sizeof(*w));


	// open file
	if ((w->fp = fopen(fname, "w")) == NULL)
	{
		fprintf(stderr, "VCDWriter Error: Can't open output file %s!\n", fname);
		exit(1);
	}

	// init list
	w->head = NULL;

	w->symbolCount = '!';
	w->tickCount = 0;

    return w;
}

void vcdRegisterSignal(vcdWriter *w, const int idx,  const char* name, size_t width)
{
	signal *newSig = malloc(sizeof(*newSig));
	if (newSig == NULL) {
		fprintf(stderr, "VCDWriter Error: couldn't register space for signal %s!\n", name);
		exit(-1);
	}

	if (w->symbolCount > '~') {
		fprintf(stderr, "VCDWriter Error: out of symbols!\n");
		exit(1);
	}

	// copy values
	newSig->idx = idx;
	newSig->width = width;
	newSig->symbol = (w->symbolCount)++;
	strncpy(newSig->name, name, NAMELEN);

	// add to list
	LL_APPEND(w->head, newSig);
}

void vcdWriteHeader(vcdWriter *w)
{
	signal *sig;

	// static header data
	fprintf(w->fp, "$date %s $end\n", timeStamp());
	fprintf(w->fp, "$version pshdlVcd V1 $end\n");
	fprintf(w->fp, "$timescale 1 us $end\n");
	fprintf(w->fp, "$scope module top $end\n");

	// iterate over registerd signals
	LL_FOREACH(w->head, sig) {
	  fprintf(w->fp, "$var wire %zu %c %s $end\n", sig->width, sig->symbol, sig->name);
	}

	fprintf(w->fp, "$upscope $end\n");
	fprintf(w->fp, "$enddefinitions $end\n");
}

void vcdTick(vcdWriter *w)
{
	signal *sig;

	// the timestamp
	fprintf(w->fp, "#%u\n", (w->tickCount)++);

	// the list of signals
	LL_FOREACH(w->head, sig) {
		fprintf(w->fp, "b%s %c\n", int2bin(pshdl_sim_getOutput(sig->idx), sig->width), sig->symbol);
	}

}


void vcdCloseWriter(vcdWriter *w)
{
	fflush(w->fp);
	fclose(w->fp);
}

// helpers
static char * timeStamp()
{
	static char buf[32];

	struct timeval now;
	struct tm tmp;

	gettimeofday(&now, NULL);

	localtime_r(&now.tv_sec, &tmp);
	strftime(buf, sizeof(buf), "%F %T", &tmp);

	return buf;
}


// sadly 'r+value symbol' doesn't work for gtkwave
// so we convert everything to binary strings... sigh
//
// thanks http://stackoverflow.com/a/1024446
char * int2bin(uint64_t i, size_t bits)
{
    char * str = malloc(bits + 1);
    if(!str) return NULL;
    str[bits] = 0;

    // type punning because signed shift is implementation-defined
    unsigned u = *(unsigned *)&i;
    for(; bits--; u >>= 1)
    	str[bits] = u & 1 ? '1' : '0';

    return str;
}
