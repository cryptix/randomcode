#include <stdio.h>
#include <unistd.h>

int main(int argc, char const *argv[])
{
	int n = atoi(argv[1]);
	char bufa[256] = {0};
	for (int i = 0; i < n; ++i)
	{
		read(3+i, bufa,255);
		printf("buf%d:%s\n",i,bufa);
	}

	return 0;
}