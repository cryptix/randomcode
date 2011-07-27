#include <stdio.h>
#include <string.h>

int main(void) {

  char *str = "abcd\r";

  if(str[strlen(str)-1] == '\r') {
    printf("true\n");
  } else {
    printf("false\n");
  }

  return 0;
};
