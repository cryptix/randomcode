#include <stdio.h>
#include <stdlib.h>
#include "filetools.h"

/* read in filename and return buf* on success, NULL otherwise */
BYTE* file2buf(char* filename) {
	FILE *fp;
	BYTE *buf;
	int fsize;

	if( (fp=fopen(filename, "rb")) == NULL ) {
		fprintf(stderr, "Error0: Couldn't open '%s' for reading\n", filename);
		return NULL;
	}
	if( fseek(fp,0,SEEK_END) == -1) {
		fprintf(stderr, "Error1: Couldn't determain filesize of '%s'\n", filename);
		return NULL;
	} else {
		/* Allocate memory for file */
		if( (fsize=ftell(fp)) != -1 )
			if( (buf = malloc(sizeof(BYTE)*fsize)) == NULL ) {
				fprintf(stderr, "Error2: Couldn't allocate memory for '%s'\n", filename);
				return NULL;
			}

		rewind(fp);
	}
	if( fread(buf, sizeof(BYTE), fsize, fp) != fsize ) {
		fprintf(stderr, "Error3: Couldn't copy '%s' to buffer\n", filename);
		return NULL;
	}

	fclose(fp);

	return buf;
}

/* write buf* to filename, return 1 on sucess 0 otherwise */
int buf2file(char* filename, BYTE* buf, int size) {
	FILE *fp;

	if( (fp=fopen(filename, "wb")) == NULL ) {
		fprintf(stderr, "Error0: Couldn't opeen '%s' for writing\n",filename);
		return 0;
	}

	if( fwrite(buf, sizeof(BYTE), size, fp) != size ) {
		fprintf(stderr, "Error1: Couldn't write buf to '%s'\n", filename);
		return 0;
	}
	
	fclose(fp);
	free(buf);

	return 1;
}

/* return filesize on sucess, -1 otherwise */
int filesize(char* filename) {
	FILE *fp;
	int fsize;

	if( (fp=fopen(filename, "rb")) == NULL ) {
		fprintf(stderr, "Error0: Couldn't open '%s' for reading\n", filename);
		return -1;
	}
	if( fseek(fp,0,SEEK_END) == -1) {
		fprintf(stderr, "Error1: Couldn't determain filesize of '%s'\n", filename);
		return -1;
	}
	if( (fsize=ftell(fp)) != -1 ) {
		close(fp);
		return fsize;
	} else {
		close(fp);
		return -1;
	}
}
