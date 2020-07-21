---
title: NodeJs客户端文档
layout: page
show_sidebar: false
menubar: clients_menu
---

# 安装NodeJs客户端
项目地址：[Pegasus NodeJS Client](https://github.com/XiaoMi/pegasus-nodejs-client)  
下载并将客户端依赖添加到package.json中：  
`npm install pegasus-nodejs-client --save`
# 创建/关闭客户端
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
* metaServers为meta server地址列表，为必填项
* operationTimeout为本次操作的超时时间，单位是毫秒，默认是1000ms
* log为日志库实例  
 * 我们使用日志库 [log4js](https://github.com/log4js-node/log4js-node)
 * 默认使用的日志配置在`log_config.js`文件中，配置如下：
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
 上述配置表示，会将错误级别等于及高于INFO级别的日志存储在文件中，每个日志文件最大100M，最多保留10个日志文件
 * 若不想使用默认配置，则需要重新定义如上的logConfig对象，作为创建客户端时的log对象
* 当参数有误时，会抛出异常，停止后续操作

## close
```
// close client when you do not need to use it
client.close();
```

# 接口
## get
读单行数据
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
* get操作的必填参数有表名，hashKey，sortKey和callback
* hashKey，sortKey和value都是Buffer对象，这与pegasus服务端key与value均为byte的语义保持一致
* 超时时间为可选参数，默认为创建客户端时设定的超时时间
* 当读操作成功时，callback的err为空，result.value为读到的值
* 当读操作失败时，callback的result为空
* 客户端不认为读不到值时错误，因此当读不到值时，err仍为空，result.value为`Buffer('')`

## set
写单行数据
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
* set操作的必填参数有表名，hashKey，sortKey，value和callback
* ttl的含义为过期时间，单位为秒，默认ttl为0，则表示该数据不过期，若用户设置ttl为86400s，则表示该数据将在1天之后过期，用户在1天之后将无法读取到该数据

## del
删除单行数据
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
* del操作的必填参数有表名，hashKey，sortKey和callback

## multiGet
读同一个hashKey下的多行数据
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
* multiGet操作的必填参数为表名，hashKey，sortKey数组和callback
* 若sortKey数据为空数组，则表示期望获取该hashKey下的所有sortKey的值
* maxFetchCount为最多获取数据的条数，默认为100
* maxFetchSize为最大获取数据的大小，默认为1000000字节

## batchGet
读取一批数据
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
* batchGet操作的必填参数为表名，hashKey数组，sortKey数组和callback
* 与multiGet不同的是，batchGet支持读多个hashKey的值
* batchGet将等待所有本次batch的所有get操作都返回结果后才返回
* callback的err总是为null
* callback的result是一个数组，result[i].error表示第i个get操作的出错情况，result[i].data表示第i个get操作的结果

## multiSet
写同一个hashKey下的多行数据
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
* multiSet操作的必填参数为表名，hashKey，sortKey-value对象数组和callback

## batchSet
写入一批数据
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
* batchSet操作的必填参数为表名，hashKey-sortKey-value对象数组和callback
* callback的err总是为null，result[i].error表示第i个set操作的出错情况
