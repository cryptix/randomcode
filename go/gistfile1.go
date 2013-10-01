package main

import (
	"bytes"
	"fmt"
	"go/ast"
	"go/parser"
	"go/printer"
	"go/token"
	"io/ioutil"
	"reflect"
	"runtime"
)

// Returns the source of the func f.
func GetSourceAsString(f interface{}) string {
	pc := reflect.ValueOf(f).Pointer()
	file, line := runtime.FuncForPC(pc).FileLine(pc)

	var startIndex, endIndex int
	{
		b, err := ioutil.ReadFile(file)
		CheckError(err)
		startIndex, endIndex = GetLineStartEndIndicies(b, line-1)
	}

	fs := token.NewFileSet()
	fileAst, err := parser.ParseFile(fs, file, nil, 0*parser.ParseComments)
	CheckError(err)

	query := func(i interface{}) bool {
		if f, ok := i.(*ast.FuncLit); ok && startIndex <= int(f.Type.Func)-1 && int(f.Type.Func)-1 <= endIndex {
			return true
		}
		return false
	}
	funcLit := FindFirst(fileAst, query)

	return SprintAst(fs, funcLit)
}

var f2 = func() { panic(1337) }

func main() {
	f := func() {
		println("Hello from anon func!") // Comments are currently not preserved
	}
	if 5*5 > 26 { f = f2 }

	print(GetSourceAsString(f))

	// Output:
	// func() {
	// 	println("Hello from anon func!")
	// }
}

// ----------------------------------------------------------------------

// Panics on error
func CheckError(err error) {
	if nil != err { panic(err) }
}

// ----------------------------------------------------------------------

// Consistent with the default gofmt behavior
var config = &printer.Config{Mode: printer.UseSpaces | printer.TabIndent, Tabwidth: 8}

func SprintAst(fset *token.FileSet, node interface{}) string {
	var buf bytes.Buffer
	config.Fprint(&buf, fset, node)
	return buf.String()
}

func SprintAstBare(node interface{}) string {
	fset := token.NewFileSet()
	return SprintAst(fset, node)
}

func PrintlnAst(fset *token.FileSet, node interface{}) {
	fmt.Println(SprintAst(fset, node))
}

// ----------------------------------------------------------------------

// Gets the starting and ending caret indicies of line with specified lineIndex.
// Does not include newline character.
// First line has index 0.
// Returns (-1, -1) if line is not found.
func GetLineStartEndIndicies(b []byte, lineIndex int) (startIndex, endIndex int) {
	n := 0
	line := 0
	for {
		o := bytes.IndexByte(b[n:], '\n')
		if line == lineIndex {
			if o == -1 { return n, len(b) } else { return n, n + o }
		}
		if o == -1 { break }
		n += o + 1
		line++
	}

	return -1, -1
}

// ----------------------------------------------------------------------

type state struct {
	Visited map[uintptr]bool
}

func (s *state) findFirst(v reflect.Value, query func(i interface{}) bool) interface{} {
	// TODO: Should I check v.CanInterface()? It seems like I might be able to get away without it...
	if query(v.Interface()) { return v.Interface() }

	switch v.Kind() {
	case reflect.Struct:
		for i := 0; i < v.NumField(); i++ {
			if q := s.findFirst(v.Field(i), query); q != nil {
				return q
			}
		}
	case reflect.Map:
		for _, key := range v.MapKeys() {
			if q := s.findFirst(v.MapIndex(key), query); q != nil {
				return q
			}
		}
	case reflect.Array, reflect.Slice:
		for i := 0; i < v.Len(); i++ {
			if q := s.findFirst(v.Index(i), query); q != nil {
				return q
			}
		}
	case reflect.Ptr:
		if !v.IsNil() {
			if !s.Visited[v.Pointer()] {
				s.Visited[v.Pointer()] = true
				if q := s.findFirst(v.Elem(), query); q != nil {
					return q
				}
			}
		}
	case reflect.Interface:
		if !v.IsNil() {
			if q := s.findFirst(v.Elem(), query); q != nil {
				return q
			}
		}
	}

	return nil
}

func FindFirst(d interface{}, query func(i interface{}) bool) interface{} {
	s := state{Visited: make(map[uintptr]bool)}
	return s.findFirst(reflect.ValueOf(d), query)
}

