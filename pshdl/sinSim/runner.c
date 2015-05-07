#include "de.tuhh.hbubert.sinus.c"

#define idxIntAkkum 5

#define idxClk 4
#define idxRst 17
#define idxDout 15
#define idxFreq 16

#define BUF_SIZE 33
char *int2bin(uint32_t a, char *buffer) {
    buffer += (BUF_SIZE-2);

    for (int i = BUF_SIZE-2; i >= 0; i--) {
        *buffer-- = (a & 1) + '0';

        a >>= 1;
    }

    return buffer;
}

void runCycle() {
	pshdl_sim_setInput(idxClk, 0);
	pshdl_sim_run();

	pshdl_sim_setInput(idxClk, 1);
	pshdl_sim_run();
}

int main(int argc, char *argv[]) {
	char buffer[BUF_SIZE];
    buffer[BUF_SIZE - 1] = '\0';

	uint64_t cycles = 202400;
	uint64_t freq = 4096;
	if(argc == 1) {
		fprintf(stderr, "usage: %s <freq>\nusing default: %lu\n\n", argv[0], freq);
	} else {
		freq = atoi(argv[1]);
	}
	

	// reset
	pshdl_sim_setInput(idxRst,1);
	runCycle();
	pshdl_sim_setInput(idxRst,0);
	runCycle();
	
	pshdl_sim_setInput(idxFreq, freq);
	
	for(uint64_t i = 0; i < cycles; i += 1)
	{
		// eval one cycle
		runCycle();
		if (i%10 == 0) {
			int2bin(pshdl_sim_getOutput(idxIntAkkum), buffer);
			printf("%6lu %3d %s Q:%d S:%d\n", i, pshdl_sim_getOutput(idxDout), buffer,
			de_tuhh_hbubert_sinus_ddfs_Quadrant,
			de_tuhh_hbubert_sinus_ddfs_Sign);
		}

	}

	return 0;
}

