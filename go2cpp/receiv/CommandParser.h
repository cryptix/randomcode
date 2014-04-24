#include <iostream>
#include <sstream>
#include <string>

#include <jansson.h>

#define RunJobCommandFmt "{s:i}"
#define MovePlaneCommandFmt "{s:F, s:F, s:F, s:F}"

struct RunJobArg {
	int JobNo;
};

struct MoveToArg {
	double y,z,alpha,beta;
};

enum Command {
	Unknown,
    MovePlane,
    RunJob
};

class CommandParser
{
	std::string buf;

public:
	CommandParser() {};
	Command readCommand(void *&arg);

protected:	
	json_t *root;
};

class InvalidCommandException : public std::runtime_error {
public:
	json_error_t jsonErr;

	InvalidCommandException(const std::string& message, json_error_t err) : std::runtime_error(message) {jsonErr = err;}
};
