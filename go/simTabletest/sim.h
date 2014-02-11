#include <stdint.h>
#include <stdbool.h>
#include <string.h>
#include <stdio.h>
#include <time.h>
#include <stdlib.h>
#include <stdarg.h>

	typedef struct regUpdate {
		int internal;
		int offset;
	} regUpdate_t;
	
	regUpdate_t regUpdates[6];
	int regUpdatePos=0;
	bool disableEdges;
	bool disabledRegOutputlogic;
	uint64_t _Pred_de_tuhh_ict_hbubert_test3_rst_update=0;
	bool _Pred_de_tuhh_ict_hbubert_test3_rst;
	uint32_t de_tuhh_ict_hbubert_test3_a;
	uint32_t de_tuhh_ict_hbubert_test3_b;
	uint64_t de_tuhh_ict_hbubert_test3_clk_update=0;
	uint32_t de_tuhh_ict_hbubert_test3_clk;
	uint32_t de_tuhh_ict_hbubert_test3_clk_prev;
	uint32_t de_tuhh_ict_hbubert_test3_rst;
	uint32_t de_tuhh_ict_hbubert_test3_t1;
	uint32_t de_tuhh_ict_hbubert_test3_t1$reg;
	uint32_t de_tuhh_ict_hbubert_test3_t2;
	uint32_t de_tuhh_ict_hbubert_test3_t2$reg;
	uint32_t de_tuhh_ict_hbubert_test3_t3;
	uint32_t de_tuhh_ict_hbubert_test3_t3$reg;
	uint32_t de_tuhh_ict_hbubert_test3_test1_a;
	uint32_t de_tuhh_ict_hbubert_test3_test1_b;
	uint32_t de_tuhh_ict_hbubert_test3_test1_res;
	uint32_t de_tuhh_ict_hbubert_test3_test2_a;
	uint32_t de_tuhh_ict_hbubert_test3_test2_b;
	uint32_t de_tuhh_ict_hbubert_test3_test2_res;
	int epsCycle=0;
	int deltaCycle=0;
	
	void s001frame001C() {
		uint32_t t0=de_tuhh_ict_hbubert_test3_a;
		//loadInternal[internalIdx=15]
		de_tuhh_ict_hbubert_test3_test1_a=t0;
	}
	void s001frame0020() {
		uint32_t t0=de_tuhh_ict_hbubert_test3_a;
		//loadInternal[internalIdx=15]
		de_tuhh_ict_hbubert_test3_test2_a=t0;
	}
	void s001frame001E() {
		uint32_t t0=de_tuhh_ict_hbubert_test3_b;
		//loadInternal[internalIdx=16]
		de_tuhh_ict_hbubert_test3_test1_b=t0;
	}
	void s001frame0022() {
		uint32_t t0=de_tuhh_ict_hbubert_test3_b;
		//loadInternal[internalIdx=16]
		de_tuhh_ict_hbubert_test3_test2_b=t0;
	}
	void s001frame002A() {
		uint32_t t0=de_tuhh_ict_hbubert_test3_rst;
		//loadInternal[internalIdx=17]
		uint32_t t1=0;//const0
		bool t2=t0 != t1;//not_eq
		_Pred_de_tuhh_ict_hbubert_test3_rst=t2;
		_Pred_de_tuhh_ict_hbubert_test3_rst_update=((uint64_t) deltaCycle << 16ll) | (epsCycle & 0xFFFF);
	}
	void s003frame000E() {
		uint32_t t0=de_tuhh_ict_hbubert_test3_test1_a;
		//loadInternal[internalIdx=8]
		uint32_t t1=de_tuhh_ict_hbubert_test3_test1_b;
		//loadInternal[internalIdx=9]
		uint32_t t2=(t0 | t1) & 0x1l;//or[targetSizeWithType=2]
		de_tuhh_ict_hbubert_test3_test1_res=t2;
	}
	void s003frame0015() {
		uint32_t t0=de_tuhh_ict_hbubert_test3_test2_a;
		//loadInternal[internalIdx=10]
		uint32_t t1=de_tuhh_ict_hbubert_test3_test2_b;
		//loadInternal[internalIdx=11]
		uint32_t t2=(t0 & t1) & 0x1l;//and[targetSizeWithType=2]
		de_tuhh_ict_hbubert_test3_test2_res=t2;
	}
	void s005frame0002() {
		de_tuhh_ict_hbubert_test3_clk_update=((uint64_t) deltaCycle << 16l) | (epsCycle & 0xFFFF);//isRisingEdge[internalIdx=14]
		//negPredicate[internalIdx=13]
		uint32_t t2=de_tuhh_ict_hbubert_test3_test1_res;
		//loadInternal[internalIdx=6]
		uint32_t current=de_tuhh_ict_hbubert_test3_t1$reg;
		de_tuhh_ict_hbubert_test3_t1$reg=t2;
		static regUpdate_t reg;
		if (current!=t2){
			reg.internal=6;
			reg.offset=0;
			regUpdates[regUpdatePos++]=reg;
		}
	}
	void s005frame0004() {
		de_tuhh_ict_hbubert_test3_clk_update=((uint64_t) deltaCycle << 16l) | (epsCycle & 0xFFFF);//isRisingEdge[internalIdx=14]
		//negPredicate[internalIdx=13]
		uint32_t t2=de_tuhh_ict_hbubert_test3_test2_res;
		//loadInternal[internalIdx=7]
		uint32_t current=de_tuhh_ict_hbubert_test3_t2$reg;
		de_tuhh_ict_hbubert_test3_t2$reg=t2;
		static regUpdate_t reg;
		if (current!=t2){
			reg.internal=7;
			reg.offset=0;
			regUpdates[regUpdatePos++]=reg;
		}
	}
	void s005frame0006() {
		de_tuhh_ict_hbubert_test3_clk_update=((uint64_t) deltaCycle << 16l) | (epsCycle & 0xFFFF);//isRisingEdge[internalIdx=14]
		//negPredicate[internalIdx=13]
		uint32_t t2=de_tuhh_ict_hbubert_test3_test1_res;
		//loadInternal[internalIdx=6]
		uint32_t t3=de_tuhh_ict_hbubert_test3_test2_res;
		//loadInternal[internalIdx=7]
		uint32_t t4=(t2 ^ t3) & 0x1l;//xor[targetSizeWithType=2]
		uint32_t current=de_tuhh_ict_hbubert_test3_t3$reg;
		de_tuhh_ict_hbubert_test3_t3$reg=t4;
		static regUpdate_t reg;
		if (current!=t4){
			reg.internal=8;
			reg.offset=0;
			regUpdates[regUpdatePos++]=reg;
		}
	}
	void s007frame0024() {
		//posPredicate[internalIdx=13]
		de_tuhh_ict_hbubert_test3_clk_update=((uint64_t) deltaCycle << 16l) | (epsCycle & 0xFFFF);//isRisingEdge[internalIdx=14]
		uint32_t t2=0;//const0
		uint32_t t3=t2 & 0x1ll;//cast_uint[targetSize=1,currentSize=32]
		de_tuhh_ict_hbubert_test3_t1$reg=t3;
		{
			static regUpdate_t reg;
			reg.internal=6;
			reg.offset=-1;
			regUpdates[regUpdatePos++]=reg;
		}
		//writeInternal[internal=1]
		uint32_t t5=0;//const0
		//Write to #null 
		(void)t5;
	}
	void s007frame0026() {
		//posPredicate[internalIdx=13]
		de_tuhh_ict_hbubert_test3_clk_update=((uint64_t) deltaCycle << 16l) | (epsCycle & 0xFFFF);//isRisingEdge[internalIdx=14]
		uint32_t t2=0;//const0
		uint32_t t3=t2 & 0x1ll;//cast_uint[targetSize=1,currentSize=32]
		de_tuhh_ict_hbubert_test3_t2$reg=t3;
		{
			static regUpdate_t reg;
			reg.internal=7;
			reg.offset=-1;
			regUpdates[regUpdatePos++]=reg;
		}
		//writeInternal[internal=3]
		uint32_t t5=0;//const0
		//Write to #null 
		(void)t5;
	}
	void s007frame0028() {
		//posPredicate[internalIdx=13]
		de_tuhh_ict_hbubert_test3_clk_update=((uint64_t) deltaCycle << 16l) | (epsCycle & 0xFFFF);//isRisingEdge[internalIdx=14]
		uint32_t t2=0;//const0
		uint32_t t3=t2 & 0x1ll;//cast_uint[targetSize=1,currentSize=32]
		de_tuhh_ict_hbubert_test3_t3$reg=t3;
		{
			static regUpdate_t reg;
			reg.internal=8;
			reg.offset=-1;
			regUpdates[regUpdatePos++]=reg;
		}
		//writeInternal[internal=5]
		uint32_t t5=0;//const0
		//Write to #null 
		(void)t5;
	}
	bool skipEdge(uint64_t local) {
		uint64_t dc = local >> 16l;
		// Register was updated in previous delta cylce, that is ok
		if (dc < deltaCycle)
			return false;
		// Register was updated in this delta cycle but it is the same eps,
		// that is ok as well
		if ((dc == deltaCycle) && ((local & 0xFFFF) == epsCycle))
			return false;
		// Don't update
		return true;
	}
	void updateRegs() {
		int i;
		for (i=0;i<regUpdatePos; i++) {
			regUpdate_t reg=regUpdates[i];
			switch (reg.internal) {
				case 6: 
				de_tuhh_ict_hbubert_test3_t1 = de_tuhh_ict_hbubert_test3_t1$reg; break;
				case 7: 
				de_tuhh_ict_hbubert_test3_t2 = de_tuhh_ict_hbubert_test3_t2$reg; break;
				case 8: 
				de_tuhh_ict_hbubert_test3_t3 = de_tuhh_ict_hbubert_test3_t3$reg; break;
			}
		}
	}
	void pshdl_sim_run(){
		deltaCycle++;
		epsCycle=0;
		do {
			regUpdatePos=0;
		s001frame001C();
		s001frame0020();
		s001frame001E();
		s001frame0022();
		s001frame002A();
		s003frame000E();
		s003frame0015();
		bool de_tuhh_ict_hbubert_test3_clk_isRising=true;
		bool de_tuhh_ict_hbubert_test3_clk_risingIsHandled=false;
		if (!disableEdges){
			uint32_t t14=de_tuhh_ict_hbubert_test3_clk;
			uint32_t t14_prev=de_tuhh_ict_hbubert_test3_clk_prev;
			if ((t14_prev!=0) || (t14!=1)) {
				de_tuhh_ict_hbubert_test3_clk_isRising=false;
			}
		} else {
			uint32_t t14=de_tuhh_ict_hbubert_test3_clk;
			de_tuhh_ict_hbubert_test3_clk_isRising=t14==1;
		}
		if (skipEdge(de_tuhh_ict_hbubert_test3_clk_update)){
			de_tuhh_ict_hbubert_test3_clk_risingIsHandled=true;
		}
		bool p13=_Pred_de_tuhh_ict_hbubert_test3_rst;
		bool p13_fresh=true;
		uint64_t up13=_Pred_de_tuhh_ict_hbubert_test3_rst_update;
		if ((up13>>16 != deltaCycle) || ((up13&0xFFFF) != epsCycle)){
			p13_fresh=false;
		}
		if (de_tuhh_ict_hbubert_test3_clk_isRising&& !de_tuhh_ict_hbubert_test3_clk_risingIsHandled && !p13 && p13_fresh)
			s005frame0002();
		if (de_tuhh_ict_hbubert_test3_clk_isRising&& !de_tuhh_ict_hbubert_test3_clk_risingIsHandled && !p13 && p13_fresh)
			s005frame0004();
		if (de_tuhh_ict_hbubert_test3_clk_isRising&& !de_tuhh_ict_hbubert_test3_clk_risingIsHandled && !p13 && p13_fresh)
			s005frame0006();
		if (de_tuhh_ict_hbubert_test3_clk_isRising&& !de_tuhh_ict_hbubert_test3_clk_risingIsHandled && p13 && p13_fresh)
			s007frame0024();
		if (de_tuhh_ict_hbubert_test3_clk_isRising&& !de_tuhh_ict_hbubert_test3_clk_risingIsHandled && p13 && p13_fresh)
			s007frame0026();
		if (de_tuhh_ict_hbubert_test3_clk_isRising&& !de_tuhh_ict_hbubert_test3_clk_risingIsHandled && p13 && p13_fresh)
			s007frame0028();
		updateRegs();
		epsCycle++;
		} while (regUpdatePos!=0 && !disabledRegOutputlogic);
		de_tuhh_ict_hbubert_test3_clk_prev=de_tuhh_ict_hbubert_test3_clk;
	}
void pshdl_sim_setInput(int idx, long value) {
	va_list va_arrayIdx;
	(void)va_arrayIdx;
	switch (idx) {
		case 1: 
			_Pred_de_tuhh_ict_hbubert_test3_rst=value==0?false:true;
			break;
		case 2: 
			value&=0x1l;
			de_tuhh_ict_hbubert_test3_a=value;
			break;
		case 3: 
			value&=0x1l;
			de_tuhh_ict_hbubert_test3_b=value;
			break;
		case 4: 
			value&=0x1l;
			de_tuhh_ict_hbubert_test3_clk=value;
			break;
		case 5: 
			value&=0x1l;
			de_tuhh_ict_hbubert_test3_rst=value;
			break;
		case 6: 
			value&=0x1l;
			de_tuhh_ict_hbubert_test3_t1=value;
			break;
		case 7: 
			value&=0x1l;
			de_tuhh_ict_hbubert_test3_t2=value;
			break;
		case 8: 
			value&=0x1l;
			de_tuhh_ict_hbubert_test3_t3=value;
			break;
		case 9: 
			value&=0x1l;
			de_tuhh_ict_hbubert_test3_test1_a=value;
			break;
		case 10: 
			value&=0x1l;
			de_tuhh_ict_hbubert_test3_test1_b=value;
			break;
		case 11: 
			value&=0x1l;
			de_tuhh_ict_hbubert_test3_test1_res=value;
			break;
		case 12: 
			value&=0x1l;
			de_tuhh_ict_hbubert_test3_test2_a=value;
			break;
		case 13: 
			value&=0x1l;
			de_tuhh_ict_hbubert_test3_test2_b=value;
			break;
		case 14: 
			value&=0x1l;
			de_tuhh_ict_hbubert_test3_test2_res=value;
			break;
	}
}

char* pshdl_sim_getName(int idx) {
	switch (idx) {
		case 1: return "$Pred_de.tuhh.ict.hbubert.test3.rst";
		case 2: return "de.tuhh.ict.hbubert.test3.a";
		case 3: return "de.tuhh.ict.hbubert.test3.b";
		case 4: return "de.tuhh.ict.hbubert.test3.clk";
		case 5: return "de.tuhh.ict.hbubert.test3.rst";
		case 6: return "de.tuhh.ict.hbubert.test3.t1";
		case 7: return "de.tuhh.ict.hbubert.test3.t2";
		case 8: return "de.tuhh.ict.hbubert.test3.t3";
		case 9: return "de.tuhh.ict.hbubert.test3.test1_a";
		case 10: return "de.tuhh.ict.hbubert.test3.test1_b";
		case 11: return "de.tuhh.ict.hbubert.test3.test1_res";
		case 12: return "de.tuhh.ict.hbubert.test3.test2_a";
		case 13: return "de.tuhh.ict.hbubert.test3.test2_b";
		case 14: return "de.tuhh.ict.hbubert.test3.test2_res";
	}
	return 0;
}

static int varIdx[]={1,2,3,4,5,6,7,8,9,10,11,12,13,14};
int* pshdl_sim_getAvailableVarIdx(int *numElements){
	*numElements=14;
	return varIdx;
}

uint32_t pshdl_sim_getOutput(int idx) {
	va_list va_arrayIdx;
	(void)va_arrayIdx;
	switch (idx) {
		case 1: return _Pred_de_tuhh_ict_hbubert_test3_rst?1:0;
		case 2: return de_tuhh_ict_hbubert_test3_a & 0x1l;
		case 3: return de_tuhh_ict_hbubert_test3_b & 0x1l;
		case 4: return de_tuhh_ict_hbubert_test3_clk & 0x1l;
		case 5: return de_tuhh_ict_hbubert_test3_rst & 0x1l;
		case 6: return de_tuhh_ict_hbubert_test3_t1 & 0x1l;
		case 7: return de_tuhh_ict_hbubert_test3_t2 & 0x1l;
		case 8: return de_tuhh_ict_hbubert_test3_t3 & 0x1l;
		case 9: return de_tuhh_ict_hbubert_test3_test1_a & 0x1l;
		case 10: return de_tuhh_ict_hbubert_test3_test1_b & 0x1l;
		case 11: return de_tuhh_ict_hbubert_test3_test1_res & 0x1l;
		case 12: return de_tuhh_ict_hbubert_test3_test2_a & 0x1l;
		case 13: return de_tuhh_ict_hbubert_test3_test2_b & 0x1l;
		case 14: return de_tuhh_ict_hbubert_test3_test2_res & 0x1l;
	}
	return 0;
}	
