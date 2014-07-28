#include "vcdWriter.h"


size_t callCnt=0;
uint64_t pshdl_sim_getOutput(int idx, ...)
{
	uint64_t res = 42*idx+ (callCnt++);

	if (idx == 1) {
		res = 23;
	}
		return res;
}


int main(int argc, char const *argv[])
{
	vcdWriter *w = vcdCreateWriter("test.vcd.gz");



	vcdRegisterSignal(w, 1, "test", 2);
	vcdRegisterSignal(w, 2, "test3", 3);
	vcdRegisterSignal(w, 3, "test4", 5);
	vcdRegisterSignal(w, 4, "test5", 8);


	vcdWriteHeader(w);


	for(unsigned i = 0; i < 30; ++i) {
		vcdTick(w);
	}

	vcdCloseWriter(w);

	printf("vcd Done\n");

	return 0;
}