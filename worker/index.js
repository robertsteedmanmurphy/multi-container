const keys = require('./keys');
const redis = require('redis');

const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  retry_strategy: () => 1000,
});
const sub = redisClient.duplicate();

function fib(index) {
  if (index < 2) return 1;
  return fib(index - 1) + fib(index - 2);
}

// will watch redis for anytime a new message appears in redis
sub.on('message', (channel, message) => {
  // ORG server message. 
  // redisClient.hset("values", index, "Nothing yet!"); // Sets the specified fields to their respective values in the hash stored at key.
  redisClient.hset('values', message, fib(parseInt(message))); // Sets the specified fields to their respective values in the hash stored at key.
});
sub.subscribe('insert'); // Subscribes to any insert event