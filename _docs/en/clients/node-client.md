---
permalink: clients/node-client
---

# Install the Node.js Client
Project repository: [Pegasus NodeJS Client](https://github.com/apache/incubator-pegasus/tree/master/nodejs-client)

Download and add the client dependency to `package.json`:
`npm install pegasus-nodejs-client --save`

# Create/Close Client
## create
```
let pegasusClient = require('pegasus-nodejs-client');
/**
 * Create a client instance
 * @param   {Object}  configs
 *          {Array}   configs.metaServers          required
 *          {String}  configs.metaServers[i]       required
 *          {Number}  configs.operationTimeout(ms) optional
 *          {Object}  configs.log                  optional
 * @return  {Client}  client instance
 * @throws  {InvalidParamException}
 */
client = pegasusClient.create({
    metaServers: ['127.0.0.1:34601', '127.0.0.1:34602', '127.0.0.1:34603'],
    operationTimeout : 5000,
    log : log,
});
```
- `metaServers` is the list of meta server addresses and is required.
- `operationTimeout` is the timeout for the current operation in milliseconds, default is `1000` ms.
- `log` is the logger instance.
  - We use [log4js](https://github.com/log4js-node/log4js-node).
  - The default logger configuration is in `log_config.js`, as follows:
  ```
  let filename = "./logs/"+process.pid+"/pegasus-nodejs-client.log";
  let logConfig = {
      appenders: { 
        pegasus: {
          type: "file", 
          filename: filename, 
          maxLogSize: 104857600, 
          backups: 10
        } 
      },
      categories: { 
        default: { appenders: ["pegasus"], level: "INFO" } 
      }
  };
  ```
  The above configuration means logs of level `INFO` and above are written to file, each file is capped at 100MB, and at most 10 backup files are kept.
  - If you don't want to use the default configuration, redefine the `logConfig` object above and pass it as the `log` object when creating the client.
- If the parameters are invalid, an exception will be thrown and subsequent operations will stop.

## close
```
// close client when you do not need to use it
client.close();
```

# API
## get
Read a single row.
```
/**
 * Get value
 * @param {String}      tableName
 * @param {Object}      args
 *        {Buffer}      args.hashKey      required
 *        {Buffer}      args.sortKey      required
 *        {Number}      args.timeout(ms)  optional
 * @param {Function}    callback
 * @throws{InvalidParamException} callback is not function
 */
 client.get(
   tableName,  
   args, 
   function(err, result){
     // if get operation succeed, err will be null,
     // result.hashKey is hashKey, result.sortKey is sortKey, result.value is value
     // else err will be instance of PException, result will be null
   }
 );
```
- Required parameters for `get` are table name, `hashKey`, `sortKey`, and `callback`.
- `hashKey`, `sortKey`, and `value` are `Buffer` objects, consistent with Pegasus server semantics where key and value are bytes.
- `timeout` is optional, defaulting to the timeout configured when creating the client.
- On success, `callback` receives `err = null` and `result.value` is the retrieved value.
- On failure, `callback` receives `result = null`.
- The client does not treat “not found” as an error. If key not found, `err` is still `null` and `result.value` is `Buffer('')`.

## set
Write a single row.
```
/**
 * Set Value
 * @param {String}      tableName
 * @param {Object}      args
 *        {Buffer}      args.hashKey      required
 *        {Buffer}      args.sortKey      required
 *        {Buffer}      args.value        required
 *        {Number}      args.ttl(s)       optional
 *        {Number}      args.timeout(ms)  optional
 * @param {Function}    callback
 * @throws{InvalidParamException} callback is not function
 */
 client.set(
   tableName,  
   args, 
   function(err){
     // if set operation succeed, err will be null
     // else err will be instance of PException
   }
 );
```
- Required parameters for `set` are table name, `hashKey`, `sortKey`, `value`, and `callback`.
- `ttl` is the time-to-live in seconds. The default `ttl` is `0`, meaning no expiration. For example, `ttl = 86400` means the data expires in 1 day, after which the value cannot be read.

## del
Delete a single row.
```
/**
 * Delete value
 * @param {String}      tableName
 * @param {Object}      args
 *        {Buffer}      args.hashKey      required
 *        {Buffer}      args.sortKey      required
 *        {Number}      args.timeout(ms)  optional
 * @param {Function}    callback
 * @throws{InvalidParamException} callback is not function
 */
 client.del(
   tableName,  
   args, 
   function(err){
     // if set operation succeed, err will be null
     // else err will be instance of PException
   }
 );
```
- Required parameters for `del` are table name, `hashKey`, `sortKey`, and `callback`.

## multiGet
Read multiple rows under the same `hashKey`.
```
/**
 * Multi Get
 * @param {String}      tableName
 * @param {Object}      args
 *        {Buffer}      args.hashKey         required
 *        {Array}       args.sortKeyArray    required
 *        {Buffer}      args.sortKeyArray[i] required
 *        {Number}      args.timeout(ms)     optional
 *        {Number}      args.maxFetchCount   optional
 *        {Number}      args.maxFetchSize    optional
 * @param {Function}    callback
 * @throws{InvalidParamException} callback is not function
 */
 client.multiGet(
   tableName,  
   args, 
   function(err, result){
     // if operation succeed, err will be null,
     // result[i].hashKey is hashKey, result[i].sortKey is sortKey, result[i].value is value
     // else err will be instance of PException, result will be null
   }
 );
```
- Required parameters for `multiGet` are table name, `hashKey`, array of `sortKey`, and `callback`.
- If `sortKeyArray` is an empty array, all sort keys under the `hashKey` will be retrieved.
- `maxFetchCount` limits the maximum number of entries returned, default `100`.
- `maxFetchSize` limits the maximum bytes returned, default `1000000` bytes.

## batchGet
Read a batch of entries.
```
/**
 * Batch Get value
 * @param {String}      tableName
 * @param {Array}       argsArray
 *        {Buffer}      argsArray[i].hashKey      required
 *        {Buffer}      argsArray[i].sortKey      required
 *        {Number}      argsArray[i].timeout(ms)  optional
 * @param {Function}    callback
 * @throws{InvalidParamException} callback is not function
 */
 client.batchGet(
   tableName,  
   argsArray, 
   function(err, result){
     // err will be always be null, result is {'error': err, 'data': result} array
     // if batchGet[i] operation succeed, result[i].error will be null
     // result[i].data.hashKey is hashKey, result[i].data.sortKey is sortKey, result[i].data.value is value
     // else result[i].error will be instance of PException, result[i].data will be null
   }
 );
```
- Required parameters for `batchGet` are table name, arrays of `hashKey` and `sortKey`, and `callback`.
- Unlike `multiGet`, `batchGet` supports reading values from multiple `hashKey`s.
- `batchGet` waits until all `get` operations in the batch have returned before responding.
- `callback`'s `err` is always `null`.
- `callback`'s `result` is an array, where `result[i].error` indicates the error of the i-th `get` operation, and `result[i].data` indicates its result.

## multiSet
Write multiple rows under the same `hashKey`.
```
/**
 * Multi Set
 * @param {String}      tableName
 * @param {Object}      args
 *        {Buffer}      args.hashKey           required
 *        {Array}       args.sortKeyValueArray required
 *                      {'key' : sortKey, 'value' : value}
 *        {Number}      args.timeout(ms)       optional
 *        {Number}      args.ttl(s)            optional
 * @param {Function}    callback
 * @throws{InvalidParamException} callback is not function
 */
 client.multiSet(
   tableName,  
   args, 
   function(err){
     // if set operation succeed, err will be null
     // else err will be instance of PException
   }
 );
```
- Required parameters for `multiSet` are table name, `hashKey`, array of `sortKey`-`value` objects, and `callback`.

## batchSet
Write a batch of entries.
```
/**
 * Batch Set value
 * @param {String}      tableName
 * @param {Array}       argsArray
 *        {Buffer}      argsArray[i].hashKey      required
 *        {Buffer}      argsArray[i].sortKey      required
 *        {Buffer}      argsArray[i].value        required
 *        {Number}      argsArray[i].ttl          optional
 *        {Number}      argsArray[i].timeout(ms)  optional
 * @param {Function}    callback
 * @throws{InvalidParamException} callback is not function
 */
 client.batchSet(
   tableName,  
   argsArray, 
   function(err, result){
     // err will be always be null, result is {'error': err} array
     // if batchSet[i] operation succeed, result[i].error will be null
     // else result[i].error will be instance of PException
   }
 );
```
- Required parameters for `batchSet` are table name, array of `hashKey`-`sortKey`-`value` objects, and `callback`.
- `callback`'s `err` is always `null`. `result[i].error` indicates the error status of the i-th `set` operation.
