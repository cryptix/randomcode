CFLAGS=-Wall


all: FileWriter VDATester runVDATester

FileWriter: FileWriter.cpp
	clang++ $(CFLAGS) $< -o $@

VDATester: VDATester.cpp VDAWriter.cpp
	clang++ $(CFLAGS) $< -o $@

runVDATester: VDATester
	./VDATester