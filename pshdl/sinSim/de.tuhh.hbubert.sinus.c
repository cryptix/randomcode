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
	
	regUpdate_t regUpdates[7];
	int regUpdatePos=0;
	bool disableEdges;
	bool disabledRegOutputlogic;
	uint64_t _Pred_de_tuhh_hbubert_sinus_if0_update=0;
	bool _Pred_de_tuhh_hbubert_sinus_if0;
	uint64_t _Pred_de_tuhh_hbubert_sinus_if1_update=0;
	bool _Pred_de_tuhh_hbubert_sinus_if1;
	uint64_t _Pred_de_tuhh_hbubert_sinus_rst_update=0;
	bool _Pred_de_tuhh_hbubert_sinus_rst;
	uint64_t de_tuhh_hbubert_sinus_clk_update=0;
	uint32_t de_tuhh_hbubert_sinus_clk;
	uint32_t de_tuhh_hbubert_sinus_clk_prev;
	uint32_t de_tuhh_hbubert_sinus_ddfs_Akkum;
	uint32_t de_tuhh_hbubert_sinus_ddfs_Akkum$reg;
	uint32_t de_tuhh_hbubert_sinus_ddfs_Quadrant;
	uint32_t de_tuhh_hbubert_sinus_ddfs_Result;
	uint32_t de_tuhh_hbubert_sinus_ddfs_RomAddr;
	uint32_t de_tuhh_hbubert_sinus_ddfs_RomAddr$reg;
	uint32_t de_tuhh_hbubert_sinus_ddfs_Sign;
	uint32_t de_tuhh_hbubert_sinus_ddfs_Sign$reg;
	uint32_t de_tuhh_hbubert_sinus_ddfs_SinusRom[64];
	uint32_t de_tuhh_hbubert_sinus_ddfs_clk;
	uint32_t de_tuhh_hbubert_sinus_ddfs_dout;
	uint32_t de_tuhh_hbubert_sinus_ddfs_freq;
	uint32_t de_tuhh_hbubert_sinus_ddfs_rst;
	uint32_t de_tuhh_hbubert_sinus_dout;
	uint32_t de_tuhh_hbubert_sinus_freq;
	uint32_t de_tuhh_hbubert_sinus_rst;
	int epsCycle=0;
	int deltaCycle=0;
	
	void s000frame2508() {
		uint32_t t0=0;//const0
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_dout=t1;
	}
	void s000frame2517() {
		uint32_t t0=0;//const0
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[0]=t1;
	}
	void s001frame2519() {
		uint32_t t0=0x3242a;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[1]=t1;
	}
	void s001frame259E() {
		uint32_t t0=de_tuhh_hbubert_sinus_ddfs_Akkum;
		//loadInternal[internalIdx=66]
		uint32_t t1=(t0 >> 28) & 1;//bitAccessSingle[bit=28]
		de_tuhh_hbubert_sinus_ddfs_Quadrant=t1;
	}
	void s001frame25AB() {
		uint32_t t0=de_tuhh_hbubert_sinus_ddfs_Sign;
		//loadInternal[internalIdx=70]
		uint32_t t1=0;//const0
		uint32_t t2=t1 & 0x1ll;//cast_uint[targetSize=1,currentSize=32]
		bool t3=t0 == t2;//eq
		_Pred_de_tuhh_hbubert_sinus_if1=t3;
		_Pred_de_tuhh_hbubert_sinus_if1_update=((uint64_t) deltaCycle << 16ll) | (epsCycle & 0xFFFF);
	}
	void s001frame25B4() {
		uint32_t t0=de_tuhh_hbubert_sinus_clk;
		//loadInternal[internalIdx=81]
		de_tuhh_hbubert_sinus_ddfs_clk=t0;
	}
	void s001frame259B() {
		uint32_t t0=de_tuhh_hbubert_sinus_ddfs_RomAddr;
		//loadInternal[internalIdx=73]
		uint32_t t1=t0;//cast_uint[targetSize=32,currentSize=6]
		int a0=(int)t1;//pushAddIndex
		uint32_t t2= de_tuhh_hbubert_sinus_ddfs_SinusRom[a0 & 0x3fll];
		//loadInternal[internalIdx=82]
		de_tuhh_hbubert_sinus_ddfs_Result=t2;
	}
	void s001frame25B6() {
		uint32_t t0=de_tuhh_hbubert_sinus_rst;
		//loadInternal[internalIdx=83]
		de_tuhh_hbubert_sinus_ddfs_rst=t0;
	}
	void s001frame25BE() {
		uint32_t t0=de_tuhh_hbubert_sinus_rst;
		//loadInternal[internalIdx=83]
		uint32_t t1=0;//const0
		bool t2=t0 != t1;//not_eq
		_Pred_de_tuhh_hbubert_sinus_rst=t2;
		_Pred_de_tuhh_hbubert_sinus_rst_update=((uint64_t) deltaCycle << 16ll) | (epsCycle & 0xFFFF);
	}
	void s001frame25B8() {
		uint32_t t0=de_tuhh_hbubert_sinus_freq;
		//loadInternal[internalIdx=84]
		de_tuhh_hbubert_sinus_ddfs_freq=t0;
	}
	void s002frame251B() {
		uint32_t t0=0x647d9;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[2]=t1;
	}
	void s003frame251D() {
		uint32_t t0=0x96a90;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[3]=t1;
	}
	void s003frame25A2() {
		uint32_t t0=de_tuhh_hbubert_sinus_ddfs_Quadrant;
		//loadInternal[internalIdx=69]
		uint32_t t1=0;//const0
		uint32_t t2=t1 & 0x1ll;//cast_uint[targetSize=1,currentSize=32]
		bool t3=t0 == t2;//eq
		_Pred_de_tuhh_hbubert_sinus_if0=t3;
		_Pred_de_tuhh_hbubert_sinus_if0_update=((uint64_t) deltaCycle << 16ll) | (epsCycle & 0xFFFF);
	}
	void s003frame25AE() {
		//posPredicate[internalIdx=75]
		uint32_t t1=de_tuhh_hbubert_sinus_ddfs_Result;
		//loadInternal[internalIdx=68]
		int32_t c2=t1 << 8;
		uint32_t t2=c2 >> 8;
		//cast_int[targetSize=24,currentSize=24]
		de_tuhh_hbubert_sinus_ddfs_dout=t2;
	}
	void s003frame25A0() {
		de_tuhh_hbubert_sinus_clk_update=((uint64_t) deltaCycle << 16l) | (epsCycle & 0xFFFF);//isRisingEdge[internalIdx=81]
		//negPredicate[internalIdx=80]
		uint32_t t2=de_tuhh_hbubert_sinus_ddfs_Akkum;
		//loadInternal[internalIdx=66]
		uint32_t t3=(t2 >> 29) & 1;//bitAccessSingle[bit=29]
		uint32_t current=de_tuhh_hbubert_sinus_ddfs_Sign$reg;
		de_tuhh_hbubert_sinus_ddfs_Sign$reg=t3;
		static regUpdate_t reg;
		if (current!=t3){
			reg.internal=9;
			reg.offset=0;
			regUpdates[regUpdatePos++]=reg;
		}
	}
	void s003frame2597() {
		de_tuhh_hbubert_sinus_clk_update=((uint64_t) deltaCycle << 16l) | (epsCycle & 0xFFFF);//isRisingEdge[internalIdx=81]
		//negPredicate[internalIdx=80]
		uint32_t t2=de_tuhh_hbubert_sinus_ddfs_Akkum;
		//loadInternal[internalIdx=66]
		uint32_t t3=de_tuhh_hbubert_sinus_ddfs_freq;
		//loadInternal[internalIdx=78]
		uint32_t t4=t3 & 0x3ffffll;//cast_uint[targetSize=18,currentSize=18]
		uint32_t t5=(t2 + t4) & 0x3fffffffl;//plus[targetSizeWithType=60]
		uint32_t current=de_tuhh_hbubert_sinus_ddfs_Akkum$reg;
		de_tuhh_hbubert_sinus_ddfs_Akkum$reg=t5;
		static regUpdate_t reg;
		if (current!=t5){
			reg.internal=5;
			reg.offset=0;
			regUpdates[regUpdatePos++]=reg;
		}
	}
	void s004frame251F() {
		uint32_t t0=0xc8bd3;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[4]=t1;
	}
	void s004frame25B0() {
		//negPredicate[internalIdx=75]
		uint32_t t1=0;//const0
		uint32_t t2=t1;//cast_uint[targetSize=32,currentSize=32]
		uint32_t t3=de_tuhh_hbubert_sinus_ddfs_Result;
		//loadInternal[internalIdx=68]
		uint32_t t4=(((int32_t)(t2 - t3)) << 8) >> 8;//minus[targetSizeWithType=49]
		int32_t c5=t4 << 8;
		uint32_t t5=c5 >> 8;
		//cast_int[targetSize=24,currentSize=24]
		de_tuhh_hbubert_sinus_ddfs_dout=t5;
	}
	void s005frame2521() {
		uint32_t t0=0xfab27;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[5]=t1;
	}
	void s005frame25A5() {
		//posPredicate[internalIdx=72]
		de_tuhh_hbubert_sinus_clk_update=((uint64_t) deltaCycle << 16l) | (epsCycle & 0xFFFF);//isRisingEdge[internalIdx=81]
		//negPredicate[internalIdx=80]
		uint32_t t3=de_tuhh_hbubert_sinus_ddfs_Akkum;
		//loadInternal[internalIdx=66]
		uint32_t t4=(t3 >> 22) & 0x3fll;//bitAccessSingleRange[from=27,to=22]
		uint32_t current=de_tuhh_hbubert_sinus_ddfs_RomAddr$reg;
		de_tuhh_hbubert_sinus_ddfs_RomAddr$reg=t4;
		static regUpdate_t reg;
		if (current!=t4){
			reg.internal=8;
			reg.offset=0;
			regUpdates[regUpdatePos++]=reg;
		}
	}
	void s005frame2512() {
		//posPredicate[internalIdx=80]
		de_tuhh_hbubert_sinus_clk_update=((uint64_t) deltaCycle << 16l) | (epsCycle & 0xFFFF);//isRisingEdge[internalIdx=81]
		uint32_t t2=0;//const0
		uint32_t t3=t2 & 0x1ll;//cast_uint[targetSize=1,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_Sign$reg=t3;
		{
			static regUpdate_t reg;
			reg.internal=9;
			reg.offset=-1;
			regUpdates[regUpdatePos++]=reg;
		}
		//writeInternal[internal=71]
		uint32_t t5=0;//const0
		//Write to #null 
		(void)t5;
	}
	void s005frame250E() {
		//posPredicate[internalIdx=80]
		de_tuhh_hbubert_sinus_clk_update=((uint64_t) deltaCycle << 16l) | (epsCycle & 0xFFFF);//isRisingEdge[internalIdx=81]
		uint32_t t2=0;//const0
		uint32_t t3=t2 & 0x3fffffffll;//cast_uint[targetSize=30,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_Akkum$reg=t3;
		{
			static regUpdate_t reg;
			reg.internal=5;
			reg.offset=-1;
			regUpdates[regUpdatePos++]=reg;
		}
		//writeInternal[internal=67]
		uint32_t t5=0;//const0
		//Write to #null 
		(void)t5;
	}
	void s006frame2523() {
		uint32_t t0=0x12c810;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[6]=t1;
	}
	void s006frame25A7() {
		//negPredicate[internalIdx=72]
		de_tuhh_hbubert_sinus_clk_update=((uint64_t) deltaCycle << 16l) | (epsCycle & 0xFFFF);//isRisingEdge[internalIdx=81]
		//negPredicate[internalIdx=80]
		uint32_t t3=0x3f;//loadConstant[constantIdx=0]
		uint32_t t4=de_tuhh_hbubert_sinus_ddfs_Akkum;
		//loadInternal[internalIdx=66]
		uint32_t t5=(t4 >> 22) & 0x3fll;//bitAccessSingleRange[from=27,to=22]
		uint32_t t6=(t3 - t5) & 0x3fl;//minus[targetSizeWithType=12]
		uint32_t current=de_tuhh_hbubert_sinus_ddfs_RomAddr$reg;
		de_tuhh_hbubert_sinus_ddfs_RomAddr$reg=t6;
		static regUpdate_t reg;
		if (current!=t6){
			reg.internal=8;
			reg.offset=0;
			regUpdates[regUpdatePos++]=reg;
		}
	}
	void s006frame25BA() {
		uint32_t t0=0x800000;//loadConstant[constantIdx=0]
		uint32_t t1=de_tuhh_hbubert_sinus_ddfs_dout;
		//loadInternal[internalIdx=0]
		uint32_t t2=t1 & 0xffffffll;//cast_uint[targetSize=24,currentSize=24]
		uint32_t t3=(t0 + t2) & 0xffffffl;//plus[targetSizeWithType=48]
		uint32_t t4=t3 & 0xffffffll;//cast_uint[targetSize=24,currentSize=24]
		de_tuhh_hbubert_sinus_dout=t4;
	}
	void s007frame2525() {
		uint32_t t0=0x15e214;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[7]=t1;
	}
	void s008frame2527() {
		uint32_t t0=0x18f8b8;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[8]=t1;
	}
	void s008frame2510() {
		//posPredicate[internalIdx=80]
		de_tuhh_hbubert_sinus_clk_update=((uint64_t) deltaCycle << 16l) | (epsCycle & 0xFFFF);//isRisingEdge[internalIdx=81]
		uint32_t t2=0;//const0
		uint32_t t3=t2 & 0x3fll;//cast_uint[targetSize=6,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_RomAddr$reg=t3;
		{
			static regUpdate_t reg;
			reg.internal=8;
			reg.offset=-1;
			regUpdates[regUpdatePos++]=reg;
		}
		//writeInternal[internal=74]
		uint32_t t5=0;//const0
		//Write to #null 
		(void)t5;
	}
	void s009frame2529() {
		uint32_t t0=0x1c0b82;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[9]=t1;
	}
	void s010frame252B() {
		uint32_t t0=0x1f19f9;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[10]=t1;
	}
	void s011frame252D() {
		uint32_t t0=0x2223a4;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[11]=t1;
	}
	void s012frame252F() {
		uint32_t t0=0x25280c;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[12]=t1;
	}
	void s013frame2531() {
		uint32_t t0=0x2826b9;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[13]=t1;
	}
	void s014frame2533() {
		uint32_t t0=0x2b1f34;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[14]=t1;
	}
	void s015frame2535() {
		uint32_t t0=0x2e110a;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[15]=t1;
	}
	void s016frame2537() {
		uint32_t t0=0x30fbc5;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[16]=t1;
	}
	void s017frame2539() {
		uint32_t t0=0x33def2;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[17]=t1;
	}
	void s018frame253B() {
		uint32_t t0=0x36ba20;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[18]=t1;
	}
	void s019frame253D() {
		uint32_t t0=0x398cdd;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[19]=t1;
	}
	void s020frame253F() {
		uint32_t t0=0x3c56ba;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[20]=t1;
	}
	void s021frame2541() {
		uint32_t t0=0x3f1749;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[21]=t1;
	}
	void s022frame2543() {
		uint32_t t0=0x41ce1e;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[22]=t1;
	}
	void s023frame2545() {
		uint32_t t0=0x447acd;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[23]=t1;
	}
	void s024frame2547() {
		uint32_t t0=0x471cec;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[24]=t1;
	}
	void s025frame2549() {
		uint32_t t0=0x49b415;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[25]=t1;
	}
	void s026frame254B() {
		uint32_t t0=0x4c3fdf;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[26]=t1;
	}
	void s027frame254D() {
		uint32_t t0=0x4ebfe8;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[27]=t1;
	}
	void s028frame254F() {
		uint32_t t0=0x5133cc;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[28]=t1;
	}
	void s029frame2551() {
		uint32_t t0=0x539b2a;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[29]=t1;
	}
	void s030frame2553() {
		uint32_t t0=0x55f5a4;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[30]=t1;
	}
	void s031frame2555() {
		uint32_t t0=0x5842dd;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[31]=t1;
	}
	void s032frame2557() {
		uint32_t t0=0x5a8279;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[32]=t1;
	}
	void s033frame2559() {
		uint32_t t0=0x5cb420;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[33]=t1;
	}
	void s034frame255B() {
		uint32_t t0=0x5ed77c;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[34]=t1;
	}
	void s035frame255D() {
		uint32_t t0=0x60ec38;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[35]=t1;
	}
	void s036frame255F() {
		uint32_t t0=0x62f201;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[36]=t1;
	}
	void s037frame2561() {
		uint32_t t0=0x64e889;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[37]=t1;
	}
	void s038frame2563() {
		uint32_t t0=0x66cf81;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[38]=t1;
	}
	void s039frame2565() {
		uint32_t t0=0x68a69e;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[39]=t1;
	}
	void s040frame2567() {
		uint32_t t0=0x6a6d98;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[40]=t1;
	}
	void s041frame2569() {
		uint32_t t0=0x6c2429;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[41]=t1;
	}
	void s042frame256B() {
		uint32_t t0=0x6dca0d;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[42]=t1;
	}
	void s043frame256D() {
		uint32_t t0=0x6f5f02;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[43]=t1;
	}
	void s044frame256F() {
		uint32_t t0=0x70e2cb;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[44]=t1;
	}
	void s045frame2571() {
		uint32_t t0=0x72552c;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[45]=t1;
	}
	void s046frame2573() {
		uint32_t t0=0x73b5eb;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[46]=t1;
	}
	void s047frame2575() {
		uint32_t t0=0x7504d3;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[47]=t1;
	}
	void s048frame2577() {
		uint32_t t0=0x7641af;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[48]=t1;
	}
	void s049frame2579() {
		uint32_t t0=0x776c4e;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[49]=t1;
	}
	void s050frame257B() {
		uint32_t t0=0x788484;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[50]=t1;
	}
	void s051frame257D() {
		uint32_t t0=0x798a23;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[51]=t1;
	}
	void s052frame257F() {
		uint32_t t0=0x7a7d05;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[52]=t1;
	}
	void s053frame2581() {
		uint32_t t0=0x7b5d03;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[53]=t1;
	}
	void s054frame2583() {
		uint32_t t0=0x7c29fb;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[54]=t1;
	}
	void s055frame2585() {
		uint32_t t0=0x7ce3ce;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[55]=t1;
	}
	void s056frame2587() {
		uint32_t t0=0x7d8a5f;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[56]=t1;
	}
	void s057frame2589() {
		uint32_t t0=0x7e1d93;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[57]=t1;
	}
	void s058frame258B() {
		uint32_t t0=0x7e9d55;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[58]=t1;
	}
	void s059frame258D() {
		uint32_t t0=0x7f0991;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[59]=t1;
	}
	void s060frame258F() {
		uint32_t t0=0x7f6236;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[60]=t1;
	}
	void s061frame2591() {
		uint32_t t0=0x7fa736;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[61]=t1;
	}
	void s062frame2593() {
		uint32_t t0=0x7fd887;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[62]=t1;
	}
	void s063frame2595() {
		uint32_t t0=0x7ff621;//loadConstant[constantIdx=0]
		uint32_t t1=t0 & 0xffffffll;//cast_uint[targetSize=24,currentSize=32]
		de_tuhh_hbubert_sinus_ddfs_SinusRom[63]=t1;
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
				case 5: 
				de_tuhh_hbubert_sinus_ddfs_Akkum = de_tuhh_hbubert_sinus_ddfs_Akkum$reg; break;
				case 8: 
				de_tuhh_hbubert_sinus_ddfs_RomAddr = de_tuhh_hbubert_sinus_ddfs_RomAddr$reg; break;
				case 9: 
				de_tuhh_hbubert_sinus_ddfs_Sign = de_tuhh_hbubert_sinus_ddfs_Sign$reg; break;
			}
		}
	}
	void pshdl_sim_run(){
		deltaCycle++;
		epsCycle=0;
		do {
			regUpdatePos=0;
		s000frame2508();
		s000frame2517();
		s001frame2519();
		s001frame259E();
		s001frame25AB();
		s001frame25B4();
		s001frame259B();
		s001frame25B6();
		s001frame25BE();
		s001frame25B8();
		s002frame251B();
		s003frame251D();
		s003frame25A2();
		bool p75=_Pred_de_tuhh_hbubert_sinus_if1;
		bool p75_fresh=true;
		uint64_t up75=_Pred_de_tuhh_hbubert_sinus_if1_update;
		if ((up75>>16 != deltaCycle) || ((up75&0xFFFF) != epsCycle)){
			p75_fresh=false;
		}
		if (p75 && p75_fresh)
			s003frame25AE();
		bool de_tuhh_hbubert_sinus_clk_isRising=true;
		bool de_tuhh_hbubert_sinus_clk_risingIsHandled=false;
		if (!disableEdges){
			uint32_t t81=de_tuhh_hbubert_sinus_clk;
			uint32_t t81_prev=de_tuhh_hbubert_sinus_clk_prev;
			if ((t81_prev!=0) || (t81!=1)) {
				de_tuhh_hbubert_sinus_clk_isRising=false;
			}
		} else {
			uint32_t t81=de_tuhh_hbubert_sinus_clk;
			de_tuhh_hbubert_sinus_clk_isRising=t81==1;
		}
		if (skipEdge(de_tuhh_hbubert_sinus_clk_update)){
			de_tuhh_hbubert_sinus_clk_risingIsHandled=true;
		}
		bool p80=_Pred_de_tuhh_hbubert_sinus_rst;
		bool p80_fresh=true;
		uint64_t up80=_Pred_de_tuhh_hbubert_sinus_rst_update;
		if ((up80>>16 != deltaCycle) || ((up80&0xFFFF) != epsCycle)){
			p80_fresh=false;
		}
		if (de_tuhh_hbubert_sinus_clk_isRising&& !de_tuhh_hbubert_sinus_clk_risingIsHandled && !p80 && p80_fresh)
			s003frame25A0();
		if (de_tuhh_hbubert_sinus_clk_isRising&& !de_tuhh_hbubert_sinus_clk_risingIsHandled && !p80 && p80_fresh)
			s003frame2597();
		s004frame251F();
		if (!p75 && p75_fresh)
			s004frame25B0();
		s005frame2521();
		bool p72=_Pred_de_tuhh_hbubert_sinus_if0;
		bool p72_fresh=true;
		uint64_t up72=_Pred_de_tuhh_hbubert_sinus_if0_update;
		if ((up72>>16 != deltaCycle) || ((up72&0xFFFF) != epsCycle)){
			p72_fresh=false;
		}
		if (de_tuhh_hbubert_sinus_clk_isRising&& !de_tuhh_hbubert_sinus_clk_risingIsHandled && !p80 && p80_fresh && p72 && p72_fresh)
			s005frame25A5();
		if (de_tuhh_hbubert_sinus_clk_isRising&& !de_tuhh_hbubert_sinus_clk_risingIsHandled && p80 && p80_fresh)
			s005frame2512();
		if (de_tuhh_hbubert_sinus_clk_isRising&& !de_tuhh_hbubert_sinus_clk_risingIsHandled && p80 && p80_fresh)
			s005frame250E();
		s006frame2523();
		if (de_tuhh_hbubert_sinus_clk_isRising&& !de_tuhh_hbubert_sinus_clk_risingIsHandled && !p72 && p72_fresh && !p80 && p80_fresh)
			s006frame25A7();
		s006frame25BA();
		s007frame2525();
		s008frame2527();
		if (de_tuhh_hbubert_sinus_clk_isRising&& !de_tuhh_hbubert_sinus_clk_risingIsHandled && p80 && p80_fresh)
			s008frame2510();
		s009frame2529();
		s010frame252B();
		s011frame252D();
		s012frame252F();
		s013frame2531();
		s014frame2533();
		s015frame2535();
		s016frame2537();
		s017frame2539();
		s018frame253B();
		s019frame253D();
		s020frame253F();
		s021frame2541();
		s022frame2543();
		s023frame2545();
		s024frame2547();
		s025frame2549();
		s026frame254B();
		s027frame254D();
		s028frame254F();
		s029frame2551();
		s030frame2553();
		s031frame2555();
		s032frame2557();
		s033frame2559();
		s034frame255B();
		s035frame255D();
		s036frame255F();
		s037frame2561();
		s038frame2563();
		s039frame2565();
		s040frame2567();
		s041frame2569();
		s042frame256B();
		s043frame256D();
		s044frame256F();
		s045frame2571();
		s046frame2573();
		s047frame2575();
		s048frame2577();
		s049frame2579();
		s050frame257B();
		s051frame257D();
		s052frame257F();
		s053frame2581();
		s054frame2583();
		s055frame2585();
		s056frame2587();
		s057frame2589();
		s058frame258B();
		s059frame258D();
		s060frame258F();
		s061frame2591();
		s062frame2593();
		s063frame2595();
		updateRegs();
		epsCycle++;
		} while (regUpdatePos!=0 && !disabledRegOutputlogic);
		de_tuhh_hbubert_sinus_clk_prev=de_tuhh_hbubert_sinus_clk;
	}
void pshdl_sim_setInput(int idx, long value, ...) {
	va_list va_arrayIdx;
	(void)va_arrayIdx;
	switch (idx) {
		case 1: 
			_Pred_de_tuhh_hbubert_sinus_if0=value==0?false:true;
			break;
		case 2: 
			_Pred_de_tuhh_hbubert_sinus_if1=value==0?false:true;
			break;
		case 3: 
			_Pred_de_tuhh_hbubert_sinus_rst=value==0?false:true;
			break;
		case 4: 
			value&=0x1l;
			de_tuhh_hbubert_sinus_clk=value;
			break;
		case 5: 
			value&=0x3fffffffl;
			de_tuhh_hbubert_sinus_ddfs_Akkum=value;
			break;
		case 6: 
			value&=0x1l;
			de_tuhh_hbubert_sinus_ddfs_Quadrant=value;
			break;
		case 7: 
			value&=0xffffffl;
			de_tuhh_hbubert_sinus_ddfs_Result=value;
			break;
		case 8: 
			value&=0x3fl;
			de_tuhh_hbubert_sinus_ddfs_RomAddr=value;
			break;
		case 9: 
			value&=0x1l;
			de_tuhh_hbubert_sinus_ddfs_Sign=value;
			break;
		case 10: 
			value&=0xffffffl;
			va_start(va_arrayIdx, value);
			de_tuhh_hbubert_sinus_ddfs_SinusRom[va_arg(va_arrayIdx, int)]=value;
			va_end(va_arrayIdx);
			break;
		case 11: 
			value&=0x1l;
			de_tuhh_hbubert_sinus_ddfs_clk=value;
			break;
		case 12: 
			value&=0xffffffl;
			de_tuhh_hbubert_sinus_ddfs_dout=value;
			break;
		case 13: 
			value&=0x3ffffl;
			de_tuhh_hbubert_sinus_ddfs_freq=value;
			break;
		case 14: 
			value&=0x1l;
			de_tuhh_hbubert_sinus_ddfs_rst=value;
			break;
		case 15: 
			value&=0xffffffl;
			de_tuhh_hbubert_sinus_dout=value;
			break;
		case 16: 
			value&=0x3ffffl;
			de_tuhh_hbubert_sinus_freq=value;
			break;
		case 17: 
			value&=0x1l;
			de_tuhh_hbubert_sinus_rst=value;
			break;
	}
}

char* pshdl_sim_getName(int idx) {
	switch (idx) {
		case 1: return "$Pred_de.tuhh.hbubert.sinus.@if0";
		case 2: return "$Pred_de.tuhh.hbubert.sinus.@if1";
		case 3: return "$Pred_de.tuhh.hbubert.sinus.rst";
		case 4: return "de.tuhh.hbubert.sinus.clk";
		case 5: return "de.tuhh.hbubert.sinus.ddfs_Akkum";
		case 6: return "de.tuhh.hbubert.sinus.ddfs_Quadrant";
		case 7: return "de.tuhh.hbubert.sinus.ddfs_Result";
		case 8: return "de.tuhh.hbubert.sinus.ddfs_RomAddr";
		case 9: return "de.tuhh.hbubert.sinus.ddfs_Sign";
		case 10: return "de.tuhh.hbubert.sinus.ddfs_SinusRom";
		case 11: return "de.tuhh.hbubert.sinus.ddfs_clk";
		case 12: return "de.tuhh.hbubert.sinus.ddfs_dout";
		case 13: return "de.tuhh.hbubert.sinus.ddfs_freq";
		case 14: return "de.tuhh.hbubert.sinus.ddfs_rst";
		case 15: return "de.tuhh.hbubert.sinus.dout";
		case 16: return "de.tuhh.hbubert.sinus.freq";
		case 17: return "de.tuhh.hbubert.sinus.rst";
	}
	return 0;
}

static int varIdx[]={1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17};
int* pshdl_sim_getAvailableVarIdx(int *numElements){
	*numElements=17;
	return varIdx;
}

uint32_t pshdl_sim_getOutput(int idx, ...) {
	va_list va_arrayIdx;
	(void)va_arrayIdx;
	switch (idx) {
		case 1: return _Pred_de_tuhh_hbubert_sinus_if0?1:0;
		case 2: return _Pred_de_tuhh_hbubert_sinus_if1?1:0;
		case 3: return _Pred_de_tuhh_hbubert_sinus_rst?1:0;
		case 4: return de_tuhh_hbubert_sinus_clk & 0x1l;
		case 5: return de_tuhh_hbubert_sinus_ddfs_Akkum & 0x3fffffffl;
		case 6: return de_tuhh_hbubert_sinus_ddfs_Quadrant & 0x1l;
		case 7: return de_tuhh_hbubert_sinus_ddfs_Result & 0xffffffl;
		case 8: return de_tuhh_hbubert_sinus_ddfs_RomAddr & 0x3fl;
		case 9: return de_tuhh_hbubert_sinus_ddfs_Sign & 0x1l;
		case 10: {
			va_start(va_arrayIdx, idx);
			uint32_t res=de_tuhh_hbubert_sinus_ddfs_SinusRom[va_arg(va_arrayIdx, int)] & 0xffffffl;
			va_end(va_arrayIdx);
			return res;
		}
		case 11: return de_tuhh_hbubert_sinus_ddfs_clk & 0x1l;
		case 12: return de_tuhh_hbubert_sinus_ddfs_dout & 0xffffffl;
		case 13: return de_tuhh_hbubert_sinus_ddfs_freq & 0x3ffffl;
		case 14: return de_tuhh_hbubert_sinus_ddfs_rst & 0x1l;
		case 15: return de_tuhh_hbubert_sinus_dout & 0xffffffl;
		case 16: return de_tuhh_hbubert_sinus_freq & 0x3ffffl;
		case 17: return de_tuhh_hbubert_sinus_rst & 0x1l;
	}
	return 0;
}	
