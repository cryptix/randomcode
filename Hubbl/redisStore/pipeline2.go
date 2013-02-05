package main

import (
	"fmt"
	"github.com/vmihailenco/redis"
)

func main() {
	password := "" // no password
	db := -1       // default db

	client := redis.NewTCPClient("localhost:6379", password, int64(db))
	defer client.Close()

	pipeline, err := client.PipelineClient()
	if err != nil {
		panic(err)
	}
	defer pipeline.Close()

	set := pipeline.Set("key1", "hello1")
	get := pipeline.Get("key2")

	reqs, err := pipeline.RunQueued()
	if err != nil {
		panic(err)
	}

	if err := set.Err(); err != nil {
		panic(err)
	}
	if err := get.Err(); err != nil {
		panic(err)
	}
	fmt.Println(get.Val())
	fmt.Println(reqs[0] == set)
	fmt.Println(reqs[1] == get)
}
