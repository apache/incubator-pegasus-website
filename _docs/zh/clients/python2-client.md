---
permalink: clients/python2-client
---

# pegasus python client

## 项目地址

<https://github.com/XiaoMi/pegasus-python-client>

## 版本要求

Python 2.*

## 安装

`pip install pypegasus`

## 使用

pegasus python client使用了[twisted](https://github.com/twisted/twisted), 编写的代码会带有twisted的影子。

### 示例

完整的示例请参考[sample](https://github.com/XiaoMi/pegasus-python-client/blob/master/sample.py)。以下是简单的示例：

```
#!/usr/bin/env python
# coding:utf-8

from pypegasus.pgclient import Pegasus

from twisted.internet import reactor
from twisted.internet.defer import inlineCallbacks


@inlineCallbacks
def basic_test():
    # init
    c = Pegasus(['127.0.0.1:34601', '127.0.0.1:34602'], 'temp')

    suc = yield c.init()
    if not suc:
        reactor.stop()
        print('ERROR: connect pegasus server failed')
        return

    # set
    try:
        ret = yield c.set('hkey1', 'skey1', 'value', 0, 500)
        print('set ret: ', ret)
    except Exception as e:
        print(e)

    # get
    ret = yield c.get('hkey1', 'skey1')
    print('get ret: ', ret)

    reactor.stop()


if __name__ == "__main__":
    reactor.callWhenRunning(basic_test)
    reactor.run()
```

### log配置文件

pegasus python client使用了[logging](https://docs.python.org/2/library/logging.html)日志包，默认配置如下：

```
[loggers]
keys=root
[logger_root]
level=INFO
handlers=hand01
propagate=0
[handlers]
keys=hand01
[handler_hand01]
class=handlers.RotatingFileHandler
formatter=form01
args=('pegasus.log', 'a', 100*1024*1024, 10)
[formatters]
keys=form01
[formatter_form01]
format=%(asctime)s [%(thread)d] [%(levelname)s] %(filename)s:%(lineno)d %(message)s
datefmt=%Y-%m-%d %H:%M:%S
```

如果用户有定制需求，可以在自己的代码目录添加配置文件`logger.conf`

### API说明

#### 初始化

初始化先构造Pegasus对象，在使用init函数完成初始化：

```
class Pegasus(object):
    """
    Pegasus client class.
    """
    
    def __init__(self, meta_addrs=None, table_name='',
                 timeout=DEFAULT_TIMEOUT):
        """
        :param meta_addrs: (list) pagasus meta servers list.
                           example: ['127.0.0.1:34601', '127.0.0.1:34602', '127.0.0.1:34603']
        :param table_name: (str) table name/app name used in pegasus.
        :param timeout: (int) default timeout in milliseconds when communicate with meta sever and replica server.
        """
```

```
    def init(self):
        """
        Initialize the client before you can use it.

        :return: (DeferredList) True when initialized succeed, others when failed.
        """
```

#### ttl

判断key的剩余的ttl时间

```
def ttl(self, hash_key, sort_key, timeout=0):
    """
    Get ttl(time to live) of the data.

    :param hash_key: (str) which hash key used for this API.
    :param sort_key: (str) which sort key used for this API.
    :param timeout: (int) how long will the operation timeout in milliseconds.
                    if timeout > 0, it is a timeout value for current operation,
                    else the timeout value specified to create the instance will be used.
    :return: (tuple<error_types.code.value, int>) (code, ttl)
             code: error_types.ERR_OK.value when data exist, error_types.ERR_OBJECT_NOT_FOUND.value when data not found.
             ttl: in seconds, -1 means forever.
    """
```

#### exist

判断key是否存在

```
def exist(self, hash_key, sort_key, timeout=0):
    """
    Check value exist.

    :param hash_key: (str) which hash key used for this API.
    :param sort_key: (str) which sort key used for this API.
    :param timeout: (int) how long will the operation timeout in milliseconds.
                    if timeout > 0, it is a timeout value for current operation,
                    else the timeout value specified to create the instance will be used.
    :return: (tuple<error_types.code.value, None>) (code, ign)
             code: error_types.ERR_OK.value when data exist, error_types.ERR_OBJECT_NOT_FOUND.value when data not found.
             ign: useless, should be ignored.
    """
```

#### set

插入一条数据（若已存在则会覆盖）

```
def set(self, hash_key, sort_key, value, ttl=0, timeout=0):
    """
    Set value to be stored in <hash_key, sort_key>.

    :param hash_key: (str) which hash key used for this API.
    :param sort_key: (str) which sort key used for this API.
    :param value: (str) value to be stored under <hash_key, sort_key>.
    :param ttl: (int) ttl(time to live) in seconds of this data.
    :param timeout: (int) how long will the operation timeout in milliseconds.
                    if timeout > 0, it is a timeout value for current operation,
                    else the timeout value specified to create the instance will be used.
    :return: (tuple<error_types.code.value, None>) (code, ign)
             code: error_types.ERR_OK.value when data stored succeed.
             ign: useless, should be ignored.
    """
```

#### multi_set

同时写一条hashkey的多条sortkey数据

```
def multi_set(self, hash_key, sortkey_value_dict, ttl=0, timeout=0):
    """
    Set multiple sort_keys-values under hash_key to be stored.

    :param hash_key: (str) which hash key used for this API.
    :param sortkey_value_dict: (dict) <sort_key, value> pairs in dict.
    :param ttl: (int) ttl(time to live) in seconds of these data.
    :param timeout: (int) how long will the operation timeout in milliseconds.
                    if timeout > 0, it is a timeout value for current operation,
                    else the timeout value specified to create the instance will be used.
    :return: (tuple<error_types.code.value, _>) (code, ign)
             code: error_types.ERR_OK.value when data stored succeed.
             ign: useless, should be ignored.
    """
```

#### get

获取一条数据

```
def get(self, hash_key, sort_key, timeout=0):
    """
    Get value stored in <hash_key, sort_key>.

    :param hash_key: (str) which hash key used for this API.
    :param sort_key: (str) which sort key used for this API.
    :param timeout: (int) how long will the operation timeout in milliseconds.
                    if timeout > 0, it is a timeout value for current operation,
                    else the timeout value specified to create the instance will be used.
    :return: (tuple<error_types.code.value, str>) (code, value).
             code: error_types.ERR_OK.value when data got succeed, error_types.ERR_OBJECT_NOT_FOUND.value when data not found.
             value: data stored in this <hash_key, sort_key>
    """
```

#### multi_get

同时读一条hashkey的多条sortkey数据

```
def multi_get(self, hash_key,
              sortkey_set,
              max_kv_count=100,
              max_kv_size=1000000,
              no_value=False,
              timeout=0):
    """
    Get multiple values stored in <hash_key, sortkey> pairs.

    :param hash_key: (str) which hash key used for this API.
    :param sortkey_set: (set) sort keys in set.
    :param max_kv_count: (int) max count of k-v pairs to be fetched. max_fetch_count <= 0 means no limit.
    :param max_kv_size: (int) max total data size of k-v pairs to be fetched. max_fetch_size <= 0 means no limit.
    :param no_value: (bool) whether to fetch value of these keys.
    :param timeout: (int) how long will the operation timeout in milliseconds.
                    if timeout > 0, it is a timeout value for current operation,
                    else the timeout value specified to create the instance will be used.
    :return: (tuple<error_types.code.value, dict>) (code, kvs)
             code: error_types.ERR_OK.value when data got succeed.
             kvs: <sort_key, value> pairs in dict.
    """
```

#### multi_get_opt

同时读一条hashkey的多条sortkey数据, 读取的数据根据`multi_get_options`参数指定的模式确定。

```
def multi_get_opt(self, hash_key,
                  start_sort_key, stop_sort_key,
                  multi_get_options,
                  max_kv_count=100,
                  max_kv_size=1000000,
                  timeout=0):
    """
    Get multiple values stored in hash_key, and sort key range in [start_sort_key, stop_sort_key) as default.

    :param hash_key: (str) which hash key used for this API.
    :param start_sort_key: (str) returned k-v pairs is start from start_sort_key.
    :param stop_sort_key: (str) returned k-v pairs is stop at stop_sort_key.
    :param multi_get_options: (MultiGetOptions) configurable multi_get options.
    :param max_kv_count: (int) max count of k-v pairs to be fetched. max_fetch_count <= 0 means no limit.
    :param max_kv_size: (int) max total data size of k-v pairs to be fetched. max_fetch_size <= 0 means no limit.
    :param timeout: (int) how long will the operation timeout in milliseconds.
                    if timeout > 0, it is a timeout value for current operation,
                    else the timeout value specified to create the instance will be used.
    :return: (tuple<error_types.code.value, dict>) (code, kvs)
             code: error_types.ERR_OK.value when data got succeed.
             kvs: <sort_key, value> pairs in dict.
    """
```

其中，`MultiGetOptions`可以指定sortkey的范围、是否包含边界、子串匹配、是否返回value、是否逆序等，具体定义如下：

```
class MultiGetOptions(object):
    """
    configurable options for multi_get.
    """

    def __init__(self):
        self.start_inclusive = True
        self.stop_inclusive = False
        self.sortkey_filter_type = filter_type.FT_NO_FILTER
        self.sortkey_filter_pattern = ""
        self.no_value = False
        self.reverse = False

class filter_type:
  FT_NO_FILTER = 0
  FT_MATCH_ANYWHERE = 1
  FT_MATCH_PREFIX = 2
  FT_MATCH_POSTFIX = 3
```

#### remove

删除一条数据

```
def remove(self, hash_key, sort_key, timeout=0):
    """
    Remove the entire <hash_key, sort_key>-value in pegasus.

    :param hash_key: (str) which hash key used for this API.
    :param sort_key: (str) which sort key used for this API.
    :param timeout: (int) how long will the operation timeout in milliseconds.
                    if timeout > 0, it is a timeout value for current operation,
                    else the timeout value specified to create the instance will be used.
    :return: (tuple<error_types.code.value, None>) (code, ign)
             code: error_types.ERR_OK.value when data stored succeed.
             ign: useless, should be ignored.
    """
```

#### multi_del

批量删除一个hashkey下的多条sortkey数据

```
def multi_del(self, hash_key, sortkey_set, timeout=0):
    """
    Remove multiple entire <hash_key, sort_key>-values in pegasus.

    :param hash_key: (str) which hash key used for this API.
    :param sortkey_set: (set) sort keys in set.
    :param timeout: (int) how long will the operation timeout in milliseconds.
                    if timeout > 0, it is a timeout value for current operation,
                    else the timeout value specified to create the instance will be used.
    :return: (tuple<error_types.code.value, int>) (code, count).
             code: error_types.ERR_OK.value when data got succeed.
             count: count of deleted k-v pairs.
    """
```

#### sort_key_count

获取一个hashkey下的sortkey数量

```
def sort_key_count(self, hash_key, timeout=0):
    """
    Get the total sort key count under the hash_key.

    :param hash_key: (str) which hash key used for this API.
    :param timeout: (int) how long will the operation timeout in milliseconds.
                    if timeout > 0, it is a timeout value for current operation,
                    else the timeout value specified to create the instance will be used.
    :return: (tuple<error_types.code.value, count>) (code, count)
             code: error_types.ERR_OK.value when data got succeed, error_types.ERR_OBJECT_NOT_FOUND.value when data not found.
             value: total sort key count under the hash_key.
    """
```

#### get_sort_keys

获取一个hashkey下的sortkey值

```
def get_sort_keys(self, hash_key,
                  max_kv_count=100,
                  max_kv_size=1000000,
                  timeout=0):
    """
    Get multiple sort keys under hash_key.

    :param hash_key: (str) which hash key used for this API.
    :param max_kv_count: (int) max count of k-v pairs to be fetched. max_fetch_count <= 0 means no limit.
    :param max_kv_size: (int) max total data size of k-v pairs to be fetched. max_fetch_size <= 0 means no limit.
    :param timeout: (int) how long will the operation timeout in milliseconds.
                    if timeout > 0, it is a timeout value for current operation,
                    else the timeout value specified to create the instance will be used.
    :return: (tuple<error_types.code.value, set>) (code, ks)
             code: error_types.ERR_OK.value when data got succeed.
             ks: <sort_key, ign> pairs in dict, ign will always be empty str.
    """
```

#### get_scanner

获取scanner对象，用于指定范围的数据扫描。可以通过`scan_options`参数指定扫描的模式。

```
def get_scanner(self, hash_key,
                start_sort_key, stop_sort_key,
                scan_options):
    """
    Get scanner for hash_key, start from start_sort_key, and stop at stop_sort_key.
    Whether the scanner include the start_sort_key and stop_sort_key is configurable by scan_options

    :param hash_key: (str) which hash key used for this API.
    :param start_sort_key: (str) returned scanner is start from start_sort_key.
    :param stop_sort_key: (str) returned scanner is stop at stop_sort_key.
    :param scan_options: (ScanOptions) configurable scan options.
    :return: (PegasusScanner) scanner, instance of PegasusScanner.
    """
```

其中，`ScanOptions`可以指定是否包含边界、超时时间、一次从replica server批量获取的sortkey-value数量等，具体定义如下：

```
class ScanOptions(object):
    """
    configurable options for scan.
    """

    def __init__(self):
        self.timeout_millis = 5000
        self.batch_size = 1000
        self.start_inclusive = True
        self.stop_inclusive = False
        self.snapshot = None                   # for future use
```

#### get_unordered_scanners

一次性获取多个scanner，用于整个table的数据扫描。可以通过`scan_options`参数指定扫描的模式。

```
def get_unordered_scanners(self, max_split_count, scan_options):
    """
    Get scanners for the whole pegasus table.

    :param max_split_count: (int) max count of scanners will be returned.
    :param scan_options: (ScanOptions) configurable scan options.
    :return: (list) instance of PegasusScanner list.
             each scanner in this list can scan separate part of the whole pegasus table.
    """
```

#### scanner对象

用于数据扫描的对象，由`get_scanner`和`get_unordered_scanners`返回。使用它的`next`函数执行扫描过程。

```
class PegasusScanner(object):
    """
    Pegasus scanner class, used for scanning data in pegasus table.
    """
```

#### get_next

获取扫描得到的数据，需要循环执行，直到返回`None`结束扫描。

```
def get_next(self):
    """
    scan the next k-v pair for the scanner.
    
    :return: (tuple<tuple<hash_key, sort_key>, value> or None)
             all the sort_keys returned by this API are in ascend order.
    """
```
