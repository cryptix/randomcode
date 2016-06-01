package main

import "fmt"

type testT struct {
	Name  string
	Count int
}

func (t testT) String() string {
	return fmt.Sprintf("[N'%s' C'%d']\n", t.Name, t.Count)
}

func main() {
	a := []*testT{
		&testT{"1st", 23},
		&testT{"2nd", 24},
		&testT{"3rd", 25},
		&testT{"4th", 26},
	}

	fmt.Println(a)
	i := 1
	copy(a[i:], a[i+1:])
	a[len(a)-1] = nil
	a = a[:len(a)-1]

	fmt.Println(a)

}
