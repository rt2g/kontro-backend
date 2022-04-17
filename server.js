const express = require('express');
const app = express();
const fs = require('fs');

var mongo = require('mongodb');

const MongoClient = require('mongodb').MongoClient;
const DBRef = require('mongodb').DBRef;

var url = "mongodb://localhost:27017/";

const header = "Access-Control-Allow-Origin";

let mongoClient;
let kontroBotConnection;

async function getCities() {
    let cityPromise = new Promise((resolve, reject) => {
        MongoClient.connect(url, async function (err, db) {
            if (err) throw err;
            mongoClient = db;
            kontroBotConnection = db.db("kontroBot");
            kontroBotConnection.collection("city").find({},
                {
                    projection:
                        {
                            _id: 1
                        }
                }).toArray(function (err, result) {
                if (err) reject(err);
                resolve(result);
            });
            mongoClient.close();
        });
    });
    return (await cityPromise);
}

async function getVehicles(cityId) {
    let vehiclesPromise = new Promise((resolve, reject) => {
        MongoClient.connect(url, function (err, db) {
            if (err) throw err;
            mongoClient = db;

            kontroBotConnection = db.db(cityId);
            kontroBotConnection.collection("vehicle").find({},
                {
                    projection:
                        {
                            _id: 1
                        }
                }).toArray(function (err, result) {
                if (err) reject(err);
                resolve(result);
            });

            mongoClient.close();
        });
    });
    return await vehiclesPromise;
}

async function getLines(cityId, vehicleId) {
    let linesPromise = new Promise((resolve, reject) => {
        MongoClient.connect(url, function (err, db) {
            if (err) throw err;
            mongoClient = db;

            kontroBotConnection = db.db(cityId);
            kontroBotConnection.collection("line").find(
                {
                    vehicle: new DBRef("vehicle", vehicleId)
                },
                {
                    projection:
                        {
                            _id: 1
                        }
                }).toArray(function (err, result) {
                if (err) reject(err);
                resolve(result);
            });
            mongoClient.close();
        });
    });
    return await linesPromise;

}

async function getStations(cityId, vehicleId, lineId) {
    return await getStationsMinutes(cityId, vehicleId, lineId, 60)
}

async function getStationsMinutes(cityId, vehicleId, lineId, minutes) {

    let date = new Date();
    date.setHours(date.getHours() + 2);
    date.setMinutes(date.getMinutes() - minutes);
    date = new Date(2019, 7, 30, 1, 1, 1, 1);
    console.log(date);

    let stationsWithControlsPromise = new Promise((resolve, reject) => {
        MongoClient.connect(url, async function (err, db) {
            if (err) reject(err);
            mongoClient = db;
            kontroBotConnection = db.db(cityId);

            var stationsPromise = new Promise((resolve, reject) => {
                kontroBotConnection.collection("station").find(
                    {
                        lineOrders: {$elemMatch: {line: new DBRef("line", lineId)}}
                    },
                    {
                        projection:
                            {
                                _id: 1
                            }
                    }).toArray(function (err, result) {
                    if (err) reject(err);
                    resolve(result);
                });
            });

            var controlsPromise = new Promise((resolve, reject) => {
                kontroBotConnection.collection("ticket_control").find(
                    {
                        //$and : [
                        //
                        line: new DBRef("line", lineId)
                        //},{
                        //"date.dateTime": {$gte: date}
                        //}]
                    },
                    {
                        projection:
                            {
                                _id: 1,
                                desc: 1,
                                date: 1,
                                direction: 1,
                                station: 1
                            }
                    }
                ).toArray(function (err, result) {
                    if (err) reject(err);
                    resolve(result);
                });
            });

            let stations = await stationsPromise;
            let controls = await controlsPromise;

            for (let i = 0; i < stations.length; i++) {
                for (let j = 0; j < controls.length; j++) {
                    if (stations[i]._id === controls[j].station.oid) {
                        if (stations[i].controls === undefined) {
                            stations[i].controls = [];
                        }
                        controls[j].station = undefined;
                        stations[i].controls.push(controls[j]);
                        controls.splice(j, 1);
                        j--;
                    }
                }
            }
            resolve(stations);
            mongoClient.close();
        });
    });
    return await stationsWithControlsPromise
}

app.get('/api/cities', async (req, res) => {
    res.setHeader(header, "*");
    res.send(await getCities());
});

app.get('/api/:city/vehicles', async (req, res) => {
    const cityId = req.params.city;
    res.setHeader(header, "*");
    res.send(await getVehicles(cityId));
});

app.get('/api/:city/:vehicle/lines', async (req, res) => {
    const cityId = req.params.city;
    const vehicleId = req.params.vehicle;
    res.setHeader(header, "*");
    res.send(await getLines(cityId, vehicleId));
});

app.get('/api/:city/:vehicle/:line/stations/', async (req, res) => {
    const cityId = (req.params.city);
    const vehicleId = (req.params.vehicle);
    const lineId = (req.params.line);
    res.setHeader(header, "*");
    res.send(await getStations(cityId, vehicleId, lineId));
});

app.get('/api/:city/:vehicle/:line/stats', async (req, res) => {
    const cityId = (req.params.city);
    const vehicleId = (req.params.vehicle);
    const lineId = (req.params.line);
    res.setHeader(header, "*");
});

app.listen(1314);
console.log("server runs on 1314");


getCities();