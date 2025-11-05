---
permalink: clients/python-client
---

# Pegasus Python Client

## Project Repository

<https://github.com/apache/incubator-pegasus/tree/master/python-client>

## Requirements

Python 3.7+

## Installation

`pip3 install pypegasus3`

## Usage

The Pegasus Python client is built on [Twisted](https://github.com/twisted/twisted), so code written with it will reflect Twisted's asynchronous programming style.

### Example

For a complete example, see the [sample](https://github.com/apache/incubator-pegasus/tree/master/python-client/sample.py). Below is a minimal example:

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
    print('get ret: ',  bytes.decode(ret))

    reactor.stop()


if __name__ == "__main__":
    reactor.callWhenRunning(basic_test)
    reactor.run()
```

### Log Configuration

The Pegasus Python client uses Python's [logging](https://docs.python.org/2/library/logging.html) package. The default configuration is as follows:

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

If you need a custom logging setup, add a `logger.conf` file in your code directory.

### API Reference

#### Initialization

First construct a `Pegasus` object, and then call `init()` to complete initialization:

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
        :param table_name: (bytes) table name/app name used in pegasus.
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

#### TTL

Get the remaining TTL (time to live) of a key.

```
def ttl(self, hash_key, sort_key, timeout=0):
    """
    Get ttl(time to live) of the data.

    :param hash_key: (bytes) which hash key used for this API.
    :param sort_key: (bytes) which sort key used for this API.
    :param timeout: (int) how long will the operation timeout in milliseconds.
                    if timeout > 0, it is a timeout value for current operation,
                    else the timeout value specified to create the instance will be used.
    :return: (tuple<error_types.code.value, int>) (code, ttl)
             code: error_types.ERR_OK.value when data exist, error_types.ERR_OBJECT_NOT_FOUND.value when data not found.
             ttl: in seconds, -1 means forever.
    """
```

#### Exist

Check whether a key exists.

```
def exist(self, hash_key, sort_key, timeout=0):
    """
    Check value exist.

    :param hash_key: (bytes) which hash key used for this API.
    :param sort_key: (bytes) which sort key used for this API.
    :param timeout: (int) how long will the operation timeout in milliseconds.
                    if timeout > 0, it is a timeout value for current operation,
                    else the timeout value specified to create the instance will be used.
    :return: (tuple<error_types.code.value, None>) (code, ign)
             code: error_types.ERR_OK.value when data exist, error_types.ERR_OBJECT_NOT_FOUND.value when data not found.
             ign: useless, should be ignored.
    """
```

#### Set

Insert a record (overwrites if it already exists).

```
def set(self, hash_key, sort_key, value, ttl=0, timeout=0):
    """
    Set value to be stored in <hash_key, sort_key>.

    :param hash_key: (bytes) which hash key used for this API.
    :param sort_key: (bytes) which sort key used for this API.
    :param value: (bytes) value to be stored under <hash_key, sort_key>.
    :param ttl: (int) ttl(time to live) in seconds of this data.
    :param timeout: (int) how long will the operation timeout in milliseconds.
                    if timeout > 0, it is a timeout value for current operation,
                    else the timeout value specified to create the instance will be used.
    :return: (tuple<error_types.code.value, None>) (code, ign)
             code: error_types.ERR_OK.value when data stored succeed.
             ign: useless, should be ignored.
    """
```

#### Multi Set

Write multiple `sort_key` pairs under a single `hash_key`.

```
def multi_set(self, hash_key, sortkey_value_dict, ttl=0, timeout=0):
    """
    Set multiple sort_keys-values under hash_key to be stored.

    :param hash_key: (bytes) which hash key used for this API.
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

#### Get

Get a single record.

```
def get(self, hash_key, sort_key, timeout=0):
    """
    Get value stored in <hash_key, sort_key>.

    :param hash_key: (bytes) which hash key used for this API.
    :param sort_key: (bytes) which sort key used for this API.
    :param timeout: (int) how long will the operation timeout in milliseconds.
                    if timeout > 0, it is a timeout value for current operation,
                    else the timeout value specified to create the instance will be used.
    :return: (tuple<error_types.code.value, bytes>) (code, value).
             code: error_types.ERR_OK.value when data got succeed, error_types.ERR_OBJECT_NOT_FOUND.value when data not found.
             value: data stored in this <hash_key, sort_key>
    """
```

#### Multi Get

Get multiple records under a single `hash_key`.

```
def multi_get(self, hash_key,
              sortkey_set,
              max_kv_count=100,
              max_kv_size=1000000,
              no_value=False,
              timeout=0):
    """
    Get multiple values stored in <hash_key, sortkey> pairs.

    :param hash_key: (bytes) which hash key used for this API.
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

#### Multi Get (Options)

Read multiple records under a `hash_key` within a specified sort-key range, controlled by `multi_get_options`.

```
def multi_get_opt(self, hash_key,
                  start_sort_key, stop_sort_key,
                  multi_get_options,
                  max_kv_count=100,
                  max_kv_size=1000000,
                  timeout=0):
    """
    Get multiple values stored in hash_key, and sort key range in [start_sort_key, stop_sort_key) as default.

    :param hash_key: (bytes) which hash key used for this API.
    :param start_sort_key: (bytes) returned k-v pairs is start from start_sort_key.
    :param stop_sort_key: (bytes) returned k-v pairs is stop at stop_sort_key.
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

`MultiGetOptions` controls the sort-key range, whether boundaries are inclusive, substring matching, whether to return values, scan order, etc. Definition:

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

#### Remove

Delete a single record.

```
def remove(self, hash_key, sort_key, timeout=0):
    """
    Remove the entire <hash_key, sort_key>-value in pegasus.

    :param hash_key: (bytes) which hash key used for this API.
    :param sort_key: (bytes) which sort key used for this API.
    :param timeout: (int) how long will the operation timeout in milliseconds.
                    if timeout > 0, it is a timeout value for current operation,
                    else the timeout value specified to create the instance will be used.
    :return: (tuple<error_types.code.value, None>) (code, ign)
             code: error_types.ERR_OK.value when data stored succeed.
             ign: useless, should be ignored.
    """
```

#### Multi Del

Batch delete multiple sort keys under a single `hash_key`.

```
def multi_del(self, hash_key, sortkey_set, timeout=0):
    """
    Remove multiple entire <hash_key, sort_key>-values in pegasus.

    :param hash_key: (bytes) which hash key used for this API.
    :param sortkey_set: (set) sort keys in set.
    :param timeout: (int) how long will the operation timeout in milliseconds.
                    if timeout > 0, it is a timeout value for current operation,
                    else the timeout value specified to create the instance will be used.
    :return: (tuple<error_types.code.value, int>) (code, count).
             code: error_types.ERR_OK.value when data got succeed.
             count: count of deleted k-v pairs.
    """
```

#### Sort Key Count

Get the number of sort keys under a `hash_key`.

```
def sort_key_count(self, hash_key, timeout=0):
    """
    Get the total sort key count under the hash_key.

    :param hash_key: (bytes) which hash key used for this API.
    :param timeout: (int) how long will the operation timeout in milliseconds.
                    if timeout > 0, it is a timeout value for current operation,
                    else the timeout value specified to create the instance will be used.
    :return: (tuple<error_types.code.value, count>) (code, count)
             code: error_types.ERR_OK.value when data got succeed, error_types.ERR_OBJECT_NOT_FOUND.value when data not found.
             value: total sort key count under the hash_key.
    """
```

#### Get Sort Keys

List sort keys under a `hash_key`.

```
def get_sort_keys(self, hash_key,
                  max_kv_count=100,
                  max_kv_size=1000000,
                  timeout=0):
    """
    Get multiple sort keys under hash_key.

    :param hash_key: (bytes) which hash key used for this API.
    :param max_kv_count: (int) max count of k-v pairs to be fetched. max_fetch_count <= 0 means no limit.
    :param max_kv_size: (int) max total data size of k-v pairs to be fetched. max_fetch_size <= 0 means no limit.
    :param timeout: (int) how long will the operation timeout in milliseconds.
                    if timeout > 0, it is a timeout value for current operation,
                    else the timeout value specified to create the instance will be used.
    :return: (tuple<error_types.code.value, set>) (code, ks)
             code: error_types.ERR_OK.value when data got succeed.
             ks: <sort_key, ign> pairs in dict, ign will always be empty bytes.
    """
```

#### Get Scanner

Get a scanner for a specified range. The scanning behavior is configurable via `scan_options`.

```
def get_scanner(self, hash_key,
                start_sort_key, stop_sort_key,
                scan_options):
    """
    Get scanner for hash_key, start from start_sort_key, and stop at stop_sort_key.
    Whether the scanner include the start_sort_key and stop_sort_key is configurable by scan_options

    :param hash_key: (bytes) which hash key used for this API.
    :param start_sort_key: (bytes) returned scanner is start from start_sort_key.
    :param stop_sort_key: (bytes) returned scanner is stop at stop_sort_key.
    :param scan_options: (ScanOptions) configurable scan options.
    :return: (PegasusScanner) scanner, instance of PegasusScanner.
    """
```

`ScanOptions` allows configuring whether boundaries are inclusive, timeout, batch size fetched from the replica server, etc. Definition:

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

#### Get Unordered Scanners

Fetch multiple scanners at once for scanning the entire table. The scanning behavior is configurable via `scan_options`.

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

#### Scanner Object

Object used for scanning data, returned by `get_scanner` and `get_unordered_scanners`. Use its `get_next` function to iterate the scan.

```
class PegasusScanner(object):
    """
    Pegasus scanner class, used for scanning data in pegasus table.
    """
```

#### Get Next

Fetch the next scanned record. Call repeatedly until `None` is returned to finish scanning.

```
def get_next(self):
    """
    scan the next k-v pair for the scanner.
    :return: (tuple<tuple<hash_key, sort_key>, value> or None)
                all the sort_keys returned by this API are in ascend order.
    """
```
