#include "JsonEncoder.h"

void JsonEncoder::writeToStdout()
{
	char *jsonString = json_dumps(root,JSON_COMPACT);

	std::cout << jsonString << std::flush;

	free(jsonString);

	return;
}


JsonErrorEncoder::JsonErrorEncoder(std::string message)
{
	root = json_pack("{s:s, s:s}", "Type", "error", "Message", message.c_str());
	writeToStdout();
}


void JsonStatusEncoder::sendStatus(std::string message)
{
	root = json_pack("{s:s, s:i, s:s}","Type", "status", "Step", stepCounter, "Message", message.c_str());
	stepCounter += 1;
	writeToStdout();
}