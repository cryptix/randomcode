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

	var set *redis.StatusReq
	var get *redis.StringReq

	reqs, err := client.Pipelined(func(c *redis.PipelineClient) {
		set = c.Set("key1", "hello1")
		get = c.Get("key2")
	})

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
