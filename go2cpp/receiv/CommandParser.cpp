#include "CommandParser.h"

Command CommandParser::readCommand(void *&arg)
{
	json_error_t err;

	std::getline(std::cin,buf);

	root = json_loads(buf.c_str(), 0, &err);
	if (root == NULL)
	{
		throw InvalidCommandException("readCommand - json_loads() failed", err);
	}
	
	if (json_unpack_ex(root, &err, JSON_VALIDATE_ONLY, RunJobCommandFmt, "JobNo") == 0)
	{
		struct RunJobArg* p = (struct RunJobArg*) malloc(sizeof(struct RunJobArg));
		
		json_unpack(root, RunJobCommandFmt, "JobNo",&(p->JobNo));
		arg = p;
		
		return RunJob;
	}
	else if (json_unpack_ex(root, &err, JSON_VALIDATE_ONLY, MovePlaneCommandFmt, "Y", "Z", "Alpha", "Beta") == 0)
	{
		struct MoveToArg* p = (struct MoveToArg*) malloc(sizeof(struct MoveToArg));
		
		json_unpack(root, MovePlaneCommandFmt, "Y",&(p->y), "Z",&(p->z), "Alpha", &(p->alpha), "Beta",&(p->beta));
		arg = p;

		return MovePlane;
	}
	
	return Unknown;
}