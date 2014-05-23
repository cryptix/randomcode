/*
clang++ -std=c++11 `pkg-config --cflags --libs jansson`
*/
#include <iostream>
#include <chrono>
#include <thread>

#include <jansson.h>

const char someJson[] = "{\"someN\":42, \"someObj\":{\"a\":23, \"b\":2}}";

int main(int argc, char const *argv[])
{
	json_t *root;
    json_error_t error;

	std::cout << "Hello";
	// std::this_thread::sleep_for(std::chrono::milliseconds(500));
	std::cout << ", World!" << std::endl;

	root = json_loads(someJson, 0, &error);
	if (!root)
	{
		throw std::runtime_error(error.text);
	}

	
	int n, a, b;
	json_unpack_ex(root, &error, JSON_STRICT, "{s:i, s:{s:i,s:i}}", "someN", &n, "someObj", "a",&a, "b", &b);

	// if (error != NULL)
	// {
	// 	throw std::runtime_error(error.text);
	// }

	std::cout << "N:" << n  << "\ta:" << a << "\tb:" << b << std::endl;

	std::cout << "Done!" << std::endl;
	return 0;
}