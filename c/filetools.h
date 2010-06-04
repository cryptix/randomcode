typedef unsigned char BYTE;

BYTE* file2buf(char* filename);
int buf2file(char* filename, BYTE* buf, int fsize);
int filesze(char* filename);
