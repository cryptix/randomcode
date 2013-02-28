#include <stdio.h>
#include <string.h>

void permutate( char *str, int index );
void string_sort(char s[]);

int main(int argc, char *argv[]) {
	if(argc != 1) {
		printf("usage: %s <string>\n", argv[0]);
		return 1;
	}
	
	string_sort(argv[1]);
	permutate( argv[1],  0);
	
	return 0;
}

void permutate(char *str, int index ) {
    int i = 0;
    static int lastChar = 0;
    if( index == strlen(str) )
    { // We have a permutation so print it
        printf("%s\n", str);
        return;
    }
    for( i = index; i < strlen(str); i++ )
    {
        if( lastChar == str[i] ) {
            continue;
        } else {
            lastChar = str[i];
        }
        swap( str[index], str[i] ); // It doesn't matter how you swap.
        permutate( str, index + 1 );
        swap( str[index], str[i] );
    }
}

void string_sort(char s[]) {
	char tmp;
	int i, j, length;
	length=strlen(s);
	for(i=0; i<length-1; i++) {
		for (j=i+1; j<length; j++) {
			if (s[i] > s[j]) {
	   			tmp=s[i];
	   			s[i]=s[j];
	   			s[j]=tmp;   	
			}
		}
	}
}
