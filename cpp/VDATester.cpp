// basic file operations
#include "simplePoint.cpp"

#include "VDAWriter.cpp"


int main () {

	Point a, b, c;
  
  VDAWriter writer("fname.txt");


	a.x = 1.300013;
	a.y = 987.54113;
	a.z = 736.3838;
	
	b.x = 2.313;
	b.y = 0.054113;
	b.z = -2.3838;


	c.x = 3.313;
	c.y = -21.54113;
	c.z = -2.3838;

	writer.addPoint(a);
	writer.addPoint(b);
	writer.addPoint(c);

  writer.writeToFile();
  std::cout << "VDA-File written." << std::endl;
  return 0;
}