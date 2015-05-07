package main

import (
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"log"
)

var src = []byte(`
package main

import (
    "fmt"

    "github.com/GeertJohan/go.rice"
)

const (
	weirdTmp = "/tmp/weird"
	weirdSomethingElse = 42
)

var (
	varEasy = "1234"
	varHard = "some" + "more"
)

func main() {
var constDir = rice.MustFindBox(weirdTmp)
var literalDir = rice.MustFindBox("hello")
var boxEasy = rice.MustFindBox(varEasy)
var boxHard = rice.MustFindBox(varHard)
    fmt.Println("constDir:", constDir)
}
`)

// internal
// ========
type file struct {
	fset     *token.FileSet
	astFile  *ast.File
	src      []byte
	filename string

	main bool

	decls map[string]string
	boxes []Box
}

func (f *file) walk(fn func(ast.Node) bool) {
	ast.Walk(walker(fn), f.astFile)
}

func (f *file) find() []Box {
	f.findDecals()
	f.findBoxCalls()

	return f.boxes
}

func (f *file) findDecals() {
	// iterate over all declarations
	for _, d := range f.astFile.Decls {

		// log.Printf("#%d Decl: %+v\n", i, d)

		// only interested in generic declarations
		if genDecl, ok := d.(*ast.GenDecl); ok {

			// handle const's and vars
			if genDecl.Tok == token.CONST || genDecl.Tok == token.VAR {

				// there may be multiple
				// i.e. const ( ... )
				for _, cDecl := range genDecl.Specs {

					// havn't find another kind of spec then value but better check
					if vSpec, ok := cDecl.(*ast.ValueSpec); ok {
						log.Printf("const ValueSpec: %+v\n", vSpec)

						// iterate over Name/Value pair
						for i := 0; i < len(vSpec.Names); i++ {
							// TODO: only basic literals work currently
							switch v := vSpec.Values[i].(type) {
							case *ast.BasicLit:
								f.decls[vSpec.Names[i].Name] = v.Value
							default:
								log.Printf("Name: %s - Unsupported ValueSpec: %+v\n", vSpec.Names[i].Name, v)
							}
						}
					}
				}
			}

		}
	}

	log.Println("Decls:", f.decls)
}

func (f *file) findBoxCalls() {
	f.walk(func(node ast.Node) bool {
		ce, ok := node.(*ast.CallExpr)
		if !ok {
			return true
		}

		isMustFindBox := isPkgDot(ce.Fun, "rice", "MustFindBox")
		isFindBox := isPkgDot(ce.Fun, "rice", "FindBox")
		if !(isMustFindBox || isFindBox) || len(ce.Args) != 1 {
			return true
		}

		log.Printf("rice.MustFindBox Call!: %+v\n", ce)

		switch x := ce.Args[0].(type) {

		case *ast.BasicLit:
			log.Println("Literal Argument:", x.Value)
			f.boxes = append(f.boxes, Box{x.Value})

		case *ast.Ident:
			log.Printf("Argument Identifier: %+v", x)
			val, ok := f.decls[x.Name]
			if !ok {
				//TODO: Add ERRORs list to file type and return after iteration!
				log.Printf("Could not find identifier[%s] in decls map\n", x.Name)
				return true
			}
			f.boxes = append(f.boxes, Box{val})

		default:
			fmt.Println("Unsupported argument to rice.(must)FindBox():", x)
		}

		return true
	})
}

// helpers
// =======
func isPkgDot(expr ast.Expr, pkg, name string) bool {
	sel, ok := expr.(*ast.SelectorExpr)
	return ok && isIdent(sel.X, pkg) && isIdent(sel.Sel, name)
}

func isIdent(expr ast.Expr, ident string) bool {
	id, ok := expr.(*ast.Ident)
	return ok && id.Name == ident
}

// wrap a function to fulfill ast.Visitor interface
type walker func(ast.Node) bool

func (w walker) Visit(node ast.Node) ast.Visitor {
	if w(node) {
		return w
	}
	return nil
}

// exports
// =======
type Box struct {
	name string
}

func FindRiceBoxes(filename string, src []byte) ([]Box, error) {

	fset := token.NewFileSet()
	astFile, err := parser.ParseFile(fset, filename, src, parser.ParseComments)
	if err != nil {
		return nil, err
	}

	f := &file{fset: fset, astFile: astFile, src: src, filename: filename}
	f.decls = make(map[string]string)

	return f.find(), nil

}

func main() {
	// log.SetOutput(ioutil.Discard)

	boxes, err := FindRiceBoxes("testConst.go", src)
	if err != nil {
		panic(err)
	}

	fmt.Println("Boxes:", boxes)
}
