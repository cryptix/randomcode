#include "CommandParser.h"
#include "JsonEncoder.h"


int main(int argc, char *argv[])
{
	CommandParser p;
	Command c;

	JsonStatusEncoder *statusEnc = new JsonStatusEncoder();

	// cast me plenty
	void *arg;
	RunJobArg *rjArg;
	MoveToArg *mpArg;

	while(std::cin.good()) {
		try {
			c = p.readCommand(arg);
		} catch(InvalidCommandException& e)
		{
			new JsonErrorEncoder(e.what());
			// std::cerr << "json error:" << e.jsonErr.text << std::endl;
			return EXIT_SUCCESS;
		}

		switch(c) {
			case MovePlane:
				mpArg = (MoveToArg *) arg;
				/*
				std::cout << "MovePlane" << std::endl;
				std::cout << "y<" << mpArg->y << ">";
				std::cout << "z<" << mpArg->z << ">";
				std::cout << "a<" << mpArg->alpha << ">";
				std::cout << "b<" << mpArg->beta << ">";
				std::cout << std::endl;
				*/
				statusEnc->sendStatus("Ok");
				
				free(mpArg);
				break;
			case RunJob:
				rjArg = (RunJobArg *) arg;
				
				//std::cout << "RunJob"<< rjArg->JobNo << std::endl;
				statusEnc->sendStatus("Ok");
				
				free(rjArg);
				break;
			default:
				//std::cout << "Unknown Comamnd Decoded" << std::endl;
				statusEnc->sendStatus("Ok");
				break;
		}
	}
	
	return EXIT_SUCCESS;
}
