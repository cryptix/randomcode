/*
helpers for converting data from the pshdl sim
into a VCD format understood by GTKWave

inspired by pig2vcd http://abyz.co.uk/rpi/pigpio/pig2vcd.html
*/

#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <unistd.h>
#include <time.h>
#include <sys/time.h>
#include <stdint.h>

#define MAXSIGNALS 128
#define NAMELEN 128 // max signal name length

// =================
// type declarations

// signal represents a simualted signal
typedef struct signal {
    int idx;			// simulation index
    char symbol;		// char used inside vcd file
    char name[NAMELEN]; // name of the signal
    size_t width;		// amount of bits for this signal
    uint64_t now, last; // current and previous values
} signal;

// vcdWriter
typedef struct vcdWriter {
	FILE *fp; 			// file to write to

	int symbolCount; 	// number of signals tracked
	uint32_t tickCount; // tick counter

	signal **list;		// list of signals to track
	size_t listLen;		// current number of signals
} vcdWriter;


// =====================
// function declarations


// creates a new  vcd file (named fname)
// returns a pointer to a vcdWriter struct to use for further interaction
static vcdWriter* vcdCreateWriter(const char *fname);

// registers a signal on the vcdWriter
// these are then polled on every vcdTick call
void vcdRegisterSignal(vcdWriter *w, const int idx,  const char* name, size_t width);

// writes the vcd header, register your signals before
void vcdWriteHeader(vcdWriter *w);

// poll all registerd signals for their values and write them to file
void vcdTick(vcdWriter *w);

// close the output file
void vcdCloseWriter(vcdWriter *w);

// helpers
uint64_t pshdl_sim_getOutput(int idx, ...); // signature of sim function
static char * timeStamp();
char * int2bin(uint64_t i, size_t bits);


// ===========
// definitions

static vcdWriter* vcdCreateWriter(const char *fname)
{
	vcdWriter *w = malloc(sizeof(*w));
	if (w == NULL) {
		fprintf(stderr, "VCDWriter Error: couldn't allocate space for vcdWriter!\n");
		exit(-1);
	}

	// open file
	if ((w->fp = fopen(fname, "w")) == NULL)
	{
		fprintf(stderr, "VCDWriter Error: Can't open output file %s!\n", fname);
		exit(-2);
	}

	// init list
	w->list = calloc(MAXSIGNALS, sizeof(signal));
	if (w->list == NULL) {
		fprintf(stderr, "VCDWriter Error: couldn't allocate space for signal list!\n");
		exit(-1);
	}

	w->listLen = 0;

	w->symbolCount = '!';
	w->tickCount = 0;

    return w;
}

void vcdRegisterSignal(vcdWriter *w, const int idx,  const char* name, size_t width)
{
	// check list limit
	if (w->listLen == MAXSIGNALS) {
		fprintf(stderr, "VCDWriter Error: cant register signal %s. Limit reached!\n", name);
		exit(-1);
	}

	// allocate new signal
	signal *newSig = malloc(sizeof(*newSig));
	if (newSig == NULL) {
		fprintf(stderr, "VCDWriter Error: couldn't allocate space for signal %s!\n", name);
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
	w->list[w->listLen++] = newSig;
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
	for (int i = 0; i < w->listLen; i++)
	{
		sig = w->list[i];
		fprintf(w->fp, "$var wire %zu %c %s $end\n", sig->width, sig->symbol, sig->name);
	}

	fprintf(w->fp, "$upscope $end\n");
	fprintf(w->fp, "$enddefinitions $end\n");

	// print initial values
	fprintf(w->fp, "#0\n");
	for (int i = 0; i < w->listLen; i++)
	{
		sig = w->list[i];
		sig->now = pshdl_sim_getOutput(sig->idx);
		fprintf(w->fp, "b%s %c\n", int2bin(sig->now, sig->width), sig->symbol);
	}
}

void vcdTick(vcdWriter *w)
{
	signal *sig;

	// list of changed signals
	signal *changed[w->listLen];
	size_t changedCnt=0;

	// increase timestamp counter
	w->tickCount++;

	// get new values of all signals
	for (int i = 0; i < w->listLen; i++)
	{
		sig = w->list[i];
		sig->now = pshdl_sim_getOutput(sig->idx);
		if (sig->now != sig->last) {
			sig->last = sig->now;
			changed[changedCnt++]=sig;
		}
	}

	// if no value changed
	if (changedCnt == 0) {
		return;
	}

	// current timestamp
	fprintf(w->fp, "#%u\n", w->tickCount);

	// output changed values
	for (int i = 0; i < changedCnt; i++)
	{
		sig = changed[i];
		fprintf(w->fp, "b%s %c\n", int2bin(sig->now, sig->width), sig->symbol);
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
