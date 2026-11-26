const { Queue } = require('bullmq');
const IORedis = require('ioredis');

const redisConnection = process.env.REDIS_URL
  ? new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null })
  : new IORedis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: process.env.REDIS_PORT || 6379,
      maxRetriesPerRequest: null
    });

const peticionesWebQueue = new Queue('peticiones-web', { connection: redisConnection });
const archivosQueue = new Queue('procesamiento-archivos', { connection: redisConnection });

module.exports = { redisConnection, peticionesWebQueue, archivosQueue };