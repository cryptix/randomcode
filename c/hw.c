/* 
 * Over zealous hello world
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define HWLEN 14

int main() {
    char *buf;

    if( (buf=malloc(HWLEN)) == NULL )
        return 1;

    strncpy(buf,"Hello, World\n",HWLEN);

    printf("%s",buf);

    free(buf);
    return 0;
}
