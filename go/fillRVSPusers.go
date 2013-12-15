package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"github.com/coopernurse/gorp"
	_ "github.com/go-sql-driver/mysql"
	"io/ioutil"
	"log"
	"net/http"
	"os"
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

type Attendee struct {
	AttendeeId         int64
	First, Last, Email string
	Status             int
	ActFor1, ActFor2   int64
	// EmailVerify        string
	// LastContact        time.Time // use unix timestamp if time.Time is still bugged
}

func openMysql() *gorp.DbMap {
	db, err := sql.Open("mysql", "root:tinchen@/osdWerKommt")
	if err != nil {
		panic(err.Error())
	}
	// defer db.Close()

	err = db.Ping()
	if err != nil {
		panic(err.Error())
	}

	dbmap := &gorp.DbMap{Db: db, Dialect: gorp.MySQLDialect{"InnoDB", "UTF8"}}
	dbmap.TraceOn("[gorp]", log.New(os.Stdout, "gorpExamp:", log.Lmicroseconds))

	dbmap.AddTable(Attendee{}).SetKeys(true, "AttendeeId")

	err = dbmap.CreateTablesIfNotExists()
	if err != nil {
		panic(err.Error())
	}

	return dbmap
}

func main() {
	mysqlDbMap := openMysql()
	query := fmt.Sprintf("http://api.randomuser.me?results=%d", 15)
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

	for _, res := range apires.Results {
		newUser := Attendee{0, res.User.Name.First, res.User.Name.Last, res.User.Email, 0, 0, 0}
		err := mysqlDbMap.Insert(&newUser)
		if err != nil {
			panic(err)
		}
	}
}
