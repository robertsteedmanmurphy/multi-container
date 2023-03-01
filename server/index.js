const keys = require("./keys");

// Express App Setup
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Postgres Client Setup
const { Pool } = require("pg");
const pgClient = new Pool({
  user: keys.pgUser,
  host: keys.pgHost,
  database: keys.pgDatabase,
  password: keys.pgPassword,
  port: keys.pgPort,
});

pgClient.on("connect", (client) => {
  client
    .query("CREATE TABLE IF NOT EXISTS values (number INT)")
    .catch((err) => console.error(err));
});

// Redis Client Setup
const redis = require("redis");
const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  retry_strategy: () => 1000,
});
const redisPublisher = redisClient.duplicate();

// Express route handlers

app.get("/", (req, res) => {
  res.send("Hi");
});

// Get all values that have been submitted to redis and return all the indexs and values 
app.get("/values/all", async (req, res) => {
  const values = await pgClient.query("SELECT * from values"); // Returns all fields and values of the hash stored at key.

  res.send(values.rows);
});

app.get("/values/current", async (req, res) => {
  redisClient.hgetall("values", (err, values) => {
    res.send(values);
  });
});

app.post("/values", async (req, res) => {
  const index = req.body.index;

  if (parseInt(index) > 40) {
    return res.status(422).send("Index too high");
  }

  redisClient.hset("values", index, "Nothing yet!"); // Initially adds the value to the redis data store. Sets the specified fields to their respective values in the hash stored at key.
  redisPublisher.publish("insert", index); // Publishes a message to the redis channel. the first argument is the name of the channel to publish the message to, and the second argument is the message to be published. This will 'wake up' the worker and tell it to get the value for the server 
  pgClient.query("INSERT INTO values(number) VALUES($1)", [index]); // Store the indices that have been queried to Postgres

  res.send({ working: true }); // arbitrary return value
});

app.listen(5000, (err) => {
  console.log("Listening");
});
