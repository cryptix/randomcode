package main

import (
	"github.com/vmihailenco/redis"
	"strconv"
)

func incrKeyInTransaction(multi *redis.MultiClient) ([]redis.Req, error) {
	get := multi.Get("key")
	if err := get.Err(); err != nil {
		panic(err)
	}

	val, err := strconv.ParseInt(get.Val(), 10, 64)
	if err != nil {
		panic(err)
	}

	reqs, err := multi.Exec(func() {
		multi.Set("key", string(val+1))
	})
	// Transaction failed. Repeat.
	if err == redis.Nil {
		return incrKeyInTransaction(multi)
	}
	return reqs, err
}

func main() {
	password := "" // no password
	db := -1       // default db

	client := redis.NewTCPClient("localhost:6379", password, int64(db))
	defer client.Close()

	multi, err := client.MultiClient()
	if err != nil {
		panic(err)
	}
	defer multi.Close()

	watch := multi.Watch("key")
	if err := watch.Err(); err != nil {
		panic(err)
	}

	reqs, err := incrKeyInTransaction(multi)
	if err != nil {
		panic(err)
	}
	for _, req := range reqs {
		println(req.Args())
	}
}
