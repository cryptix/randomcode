package main

import (
	"log"
	"os"

	"database/sql"
	"github.com/coopernurse/gorp"
	_ "github.com/go-sql-driver/mysql"

	"labix.org/v2/mgo"
	"labix.org/v2/mgo/bson"
)

type VOSDTherapeut struct {
	Id      int
	Name    string
	Praxis  string
	Tele    string
	Fax     string
	Mobil   string
	Email   string
	Website string
	PLZ     string
	Ort     string
	Strasze string
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
	db, err := sql.Open("mysql", "d0180076:9ns8uZXYkUCMeHGq@tcp(dd12400.kasserver.com:3306)/d0180076?charset=utf8mb4,utf8")
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

	dbmap.AddTable(VOSDTherapeut{}).SetKeys(true, "Id")

	err = dbmap.DropTablesIfExists()
	if err != nil {
		panic(err.Error())
	}

	err = dbmap.CreateTablesIfNotExists()
	if err != nil {
		panic(err.Error())
	}

	return dbmap
}

func main() {
	// connecting mongpDb
	mongoDbSession, err := mgo.Dial("localhost")
	if err != nil {
		panic(err.Error())
	}
	defer mongoDbSession.Close()

	// connecting mysqlDb
	mysqlDbMap := openMysql()

	var pubs []VOSDTherapeut
	col := mongoDbSession.DB("OSD").C("VOSDTherapeuten")
	err = col.Find(bson.M{}).All(&pubs)
	if err != nil {
		panic(err.Error())
	}

	for _, v := range pubs {
		err = mysqlDbMap.Insert(&v)
		if err != nil {
			panic(err.Error())
		}
	}
}
