package main

import (
	"github.com/vmihailenco/redis"
)

func main() {
	password := "" // no password
	db := -1       // default db

	client := redis.NewTCPClient("localhost:6379", password, int64(db))
	defer client.Close()

	set := client.Set("foo", "bar")
	if err := set.Err(); err != nil {
		panic(err)
	}

	get := client.Get("foo")
	if err := get.Err(); err != nil {
		panic(err)
	}

	println(get.Val())
}
