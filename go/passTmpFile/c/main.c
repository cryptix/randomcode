#include <stdio.h>
#include <unistd.h>

int main(int argc, char const *argv[])
{
	char bufa[256] = {0};
	for (int i = 0; i < 3; ++i)
	{
		read(3+i, bufa,255);
		printf("buf%d:%s\n",i,bufa);
	}

	return 0;
}