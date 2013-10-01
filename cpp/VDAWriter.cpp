#include <iostream>
#include <fstream>
#include <string>
#include <iomanip>
#include <vector>
#include <sstream>

// #include "simplePoint.cpp"

class VDAWriter {
private:

	// meta constants
	static const int lineLength = 80;
	static const int lineNumLen = 7;
	static const int headerFieldLen   = 19;
	static const int headerValueLen   = 51;

	// output constants
  static const std::string HEADER;
  
  // ************************************************************************
  static const std::string VDAFS_VERSION;
	
	// ----------ANGABEN UEBER DEN ABSENDER------------------------------------
  static const std::string SENDERFIRMA;
  static const std::string ANSPRECHPARTNER;
	static const std::string TELEFON;
	static const std::string ADRESSE;
	static const std::string ERZEUGENDES_SYSTEM;
	
	// TODO: set on construction
	const std::string ERZEUGUNGSDATUM;
	// TODO: set on construction
	std::string SENDE_FILENAME;
	
	// ----------ANGABEN UEBER DAS TEIL----------------------------------------
	const std::string PROJEKT;
	const std::string OBJEKTKENNUNG;
	const std::string VARIANTE;
	const std::string VERTRAULICHKEIT;
	const std::string GUELTIGKEITSDATUM;
	
	// ----------ANGABEN UEBER/FUER DEN EMPFAENGER-----------------------------
	const std::string EMPFAENGERFIRMA;
	const std::string EMPFAENGERART;

	// private members
	std::ofstream outputFile;
	int lineNumber;

	std::vector<Point> points;

	void finishLine();
	void commentLine();
	void commentLine(std::string);

	void headerLine(std::string, std::string);
	void simpleLine(std::string, std::string);

  public:
  	VDAWriter(std::string filename) : 
  		ERZEUGUNGSDATUM("24.12.2013"),
  		PROJEKT("MessConvert"),
  		OBJEKTKENNUNG("12 / FORM UND LAGE"),
  		VARIANTE("1 / FORM UND LAGE"),
  		VERTRAULICHKEIT("Hoch"),
  		GUELTIGKEITSDATUM("Morgen"),
  		EMPFAENGERFIRMA("Test Firma"),
  		EMPFAENGERART(""),
  		lineNumber(100)
  	{
  		SENDE_FILENAME = filename;
  		outputFile.open(filename.c_str());
  	}

  	void addPoint(Point);
    int writeToFile();
};

// constants for file
const std::string VDAWriter::HEADER = "DSTSWISS";
const std::string VDAWriter::VDAFS_VERSION = "2.0";
const std::string VDAWriter::SENDERFIRMA = "DST Swiss AG";
const std::string VDAWriter::ANSPRECHPARTNER = "R. Diefenbacher";
const std::string VDAWriter::TELEFON = "+41 (0)44 868 30 88";
const std::string VDAWriter::ADRESSE = "Schuebelbachstrasse 3, CH-8193, Eglisau, Schwiss";
const std::string VDAWriter::ERZEUGENDES_SYSTEM = "ReportHelper 0.0";

// helper for line endings
void VDAWriter::finishLine() {
	// format
	outputFile.setf(std::ios::right);
	outputFile << std::setfill('0');
	outputFile << std::setw(lineNumLen);
	
	outputFile << lineNumber++;
	outputFile << "0" << std::endl;

	outputFile.unsetf(std::ios::right);
}

// helper for comment lines
void VDAWriter::commentLine() {
	// spaces for the content padding
	outputFile << std::setfill(' ');
	outputFile.setf(std::ios::left);
	
	outputFile << std::setw(lineLength - lineNumLen - 1) << "$$";

	//reset
	outputFile.unsetf(std::ios::left);
	finishLine();
}

// helper for comment lines
void VDAWriter::commentLine(std::string comment) {
	commentLine();
	outputFile.setf(std::ios::left);
	

	outputFile << std::setfill(' '); // spaces for the content padding
	outputFile << std::setw(8);
	outputFile << "$$      ";
	outputFile << std::setw(lineLength - comment.length() - lineNumLen + 3);
	outputFile << comment;
	finishLine();

	outputFile << std::setfill(' ');
	outputFile << std::setw(8);
	outputFile << "$$      ";
	outputFile << std::setw(lineLength - comment.length() - lineNumLen + 3);
	outputFile << std::string(comment.length(), '-');
	finishLine();

	//reset
	outputFile.unsetf(std::ios::left);
}

// helper for header lines
void VDAWriter::headerLine(std::string field, std::string value) {
	// spaces for the content padding
	outputFile << std::setfill(' ');

	// left aligned field
	outputFile.setf(std::ios::left);
	outputFile << std::setw(headerFieldLen) << field << ": ";

	// left aligned value
	outputFile.setf(std::ios::left);
	outputFile << std::setw(headerValueLen) << value;

	//reset
	outputFile.unsetf(std::ios::left);
	finishLine();
}

// write "x = y" line
void VDAWriter::simpleLine(std::string property, std::string value) {
  outputFile << property;
	outputFile << " = ";
	outputFile << value;
  outputFile << std::setw(lineLength - property.length() - 4 - value.length() - lineNumLen);
  outputFile << std::setfill(' ');
  outputFile << "";
  finishLine();
}

// public
//-------

void VDAWriter::addPoint(Point p) {
	points.push_back(p);
}

int VDAWriter::writeToFile() {
	
	// start header
  simpleLine(HEADER, "HEADER/20");

 	// data meta infoformation
  outputFile << "************************************************************************";
  finishLine();
  
  headerLine("VDAFS VERSION", VDAFS_VERSION);
  
  outputFile << "----------ANGABEN UEBER DEN ABSENDER------------------------------------";
	finishLine();

	headerLine("SENDERFIRMA", SENDERFIRMA);
	headerLine("ANSPRECHPARTNER", ANSPRECHPARTNER);
	headerLine("- TELEFON", TELEFON);
	headerLine("- ADRESSE", ADRESSE);
	headerLine("ERZEUGENDES SYSTEM", ERZEUGENDES_SYSTEM);
	headerLine("ERZEUGUNGSDATUM", ERZEUGUNGSDATUM);
	headerLine("SENDE-FILENAME", SENDE_FILENAME);
	
	outputFile << "----------ANGABEN UEBER DAS TEIL----------------------------------------";
	finishLine();
  
  headerLine("PROJEKT", PROJEKT);
  headerLine("OBJEKTKENNUNG", OBJEKTKENNUNG);
  headerLine("VARIANTE", VARIANTE);
  headerLine("VERTRAULICHKEIT", VERTRAULICHKEIT);
  headerLine("GUELTIGKEITSDATUM", GUELTIGKEITSDATUM);

  outputFile << "----------ANGABEN UEBER/FUER DEN EMPFAENGER-----------------------------";
  finishLine();

  headerLine("EMPFAENGERFIRMA", EMPFAENGERFIRMA);
  headerLine("EMPFAENGERART", EMPFAENGERART);

  outputFile << "************************************************************************";
  finishLine();
  // header done

  // begin set
  commentLine();
  simpleLine("S1", "BEGINSET");

  
  

  int n = 1;
  for (std::vector<Point>::iterator i = points.begin(); i != points.end(); ++i)
  {
  	std::string commentBuf;
  	std::string fieldBuf;
  	std::string valueBuf;
  	
  	comment = "Element PT_";
  	comment += n;

  	commentLine(commentBuf.str());
  	fieldBuf << "E1P" << n;
  	
  	valueBuf.setf( std::ios::showpoint );
  	valueBuf << std::setw(7) << std::setprecision(7);
  	valueBuf << "POINT /  " << i->x << ", " << i->y << ", " << i->z;
  	
  	simpleLine(fieldBuf.str(), valueBuf.str());
  	n += 1;
  }

	commentLine();
  simpleLine("S1", "ENDSET");
  commentLine();

  // print end
  simpleLine(HEADER, "END");

  outputFile.close();
  return 0;
}