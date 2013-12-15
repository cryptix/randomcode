package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"strconv"
)

type ApiResponse struct {
	Results []ApiResult
}

type ApiResult struct {
	User          ApiUser
	Seed, Version string
}

type ApiUser struct {
	Gender string
	Name   struct {
		Title, First, Last string
	}
	Email    string
	Password string
	Location struct {
		Street, City, State, Zip string
	}
}

func main() {
	var resultCnt int
	if len(os.Args) == 2 {
		var err error
		resultCnt, err = strconv.Atoi(os.Args[1])
		if err != nil {
			panic(err)
		}
	} else {
		resultCnt = 5 // default
	}

	query := fmt.Sprintf("http://api.randomuser.me?results=%d", resultCnt)
	resp, err := http.Get(query)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		panic(err)
	}

	var apires ApiResponse
	err = json.Unmarshal(body, &apires)
	if err != nil {
		panic(err)
	}

	for i, result := range apires.Results {
		fmt.Println(i, ":", result.Seed, ":", result.User)
	}
}
