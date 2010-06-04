#include <stdio.h>
#include <stdlib.h>

int gcd(int a, int b);

int main (int argc, char const *argv[])
{
	int a, b, r=0;
	
	if(argc != 3)
	{
		printf("Usage: %s a b\n", argv[0]);
		exit(1);
	}
	
	a = atoi(argv[1]);
	b = atoi(argv[2]);
	
	r = gcd(a, b);
	
	printf("GCD(%d, %d)=%d\n",a,b,r);
	
	return 0;
}

int gcd(int a, int b)
{
	if(b == 0)
		return a;
	else
		gcd(b, a%b);
}