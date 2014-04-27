#pragma once

#include <iostream>
#include <jansson.h>

class JsonEncoder
{

public:
	JsonEncoder() {};
	void writeToStdout();

protected:	
	json_t *root;
};

class JsonErrorEncoder : public JsonEncoder
{
public:
	JsonErrorEncoder(std::string message);
};

class JsonStatusEncoder : public JsonEncoder
{
	unsigned stepCounter;

public:
	JsonStatusEncoder() : JsonEncoder(), stepCounter(0) {}

	void sendStatus(std::string message);
};