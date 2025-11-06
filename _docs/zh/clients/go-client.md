---
permalink: clients/go-client
---

# 获取 go 客户端

下载：

```bash
go get github.com/apache/incubator-pegasus/go-client@<CommitId>
# 例如
go get github.com/apache/incubator-pegasus/go-client@df0eb5a
```

要求：
* Go 1.18+
* Thrift 0.13

# 客户端配置
创建 go client 实例需要配置相关参数，目前仅支持参数传递方式。  
go client 的配置参数非常简单，仅需要指定 meta servers。  
用户如果需要文件配置，需自行将参数从文件从解析，再传入 go client。
```go
// 参数配置
cfg := &pegasus.Config{
    MetaServers: []string{"0.0.0.0:34601", "0.0.0.0:34601"},
}
c := pegasus.NewClient(*cfg)

// 文件配置
cfgPath, _ := filepath.Abs("./example/pegasus-client-config.json")
rawCfg, err := ioutil.ReadFile(cfgPath)
if err != nil {
    fmt.Println(err)
    return
}
cfg := &pegasus.Config{}
json.Unmarshal(rawCfg, cfg)
c := pegasus.NewClient(*cfg)
```

# 接口定义

## 创建 Client 实例
```go
// NewClient creates a new instance of pegasus client.
// It panics if the configured addresses are illegal
func NewClient(cfg Config) Client

// Config is the configuration of pegasus client.
type Config struct {
	MetaServers []string `json:"meta_servers"`
}
```

使用完毕后，记得 close client 以释放资源，譬如：
```go
c := pegasus.NewClient(*cfg)

...

c.Close()
```

## 创建 TableConnector 实例
go client 操作数据的接口都在 TableConnector 中定义。  
一个 client 可以有多个 TableConnector 实例，每一个 TableConnector 对应一张表。
```go
// Open the specific pegasus table. If the table was opened before,
// it will reuse the previous connection to the table.
OpenTable(ctx context.Context, tableName string) (TableConnector, error)
```

## TableConnector 接口

### Get
读单行数据。
```go
// Get retrieves the entry for `hashKey` + `sortKey`.
// Returns nil if no entry matches.
// `hashKey` : CAN'T be nil or empty.
// `sortKey` : CAN'T be nil but CAN be empty.
Get(ctx context.Context, hashKey []byte, sortKey []byte) ([]byte, error)
```
注：   
* 参数：需传入 `context`、`hashKey`、`sortKey`。  
* 返回值：`value`、`error`。 如果返回 (nil,nil)，表示 key 对应的数据不存在。  
* 异常：如果出现异常，譬如网络错误、超时错误、服务端错误等，可以访问 error 获取具体错误类型 (key 对应数据不存在返回 nil)。

### Set and SetTTL
写单行数据, SetTTL 可以设置单条 kv 的 TTL。
```go
// Set the entry for `hashKey` + `sortKey` to `value`.
// If Set is called or `ttl` == 0, no data expiration is specified.
// `hashKey` : CAN'T be nil or empty.
// `sortKey` / `value` : CAN'T be nil but CAN be empty.
Set(ctx context.Context, hashKey []byte, sortKey []byte, value []byte) error
SetTTL(ctx context.Context, hashKey []byte, sortKey []byte, value []byte, ttl time.Duration) error
```
注：  
* 提供了两个版本的接口，其中第二个接口可以指定 TTL 时间。
* 参数：需传入 `context`、`hashKey`、`sortKey`、`value`、`ttl`。 `ttl` 单位为秒(s)。  
* 返回值：`error`。
* 异常：如果出现异常，譬如网络错误、超时错误、服务端错误等，可以访问 error 获取具体错误类型。

### Del
删除单行数据
```go
// Delete the entry for `hashKey` + `sortKey`.
// `hashKey` : CAN'T be nil or empty.
// `sortKey` : CAN'T be nil but CAN be empty.
Del(ctx context.Context, hashKey []byte, sortKey []byte) error
```
注：  
* 参数：需传入 `context`、`hashKey`、`sortKey`。  
* 返回值：`error`。
* 异常：如果出现异常，譬如网络错误、超时错误、服务端错误等，可以访问 error 获取具体错误类型。

### MultiGet and MultiGetOpt
读**同一 HashKey 下**的多行数据。
```go
// MultiGet/MultiGetOpt retrieves the multiple entries for `hashKey` + `sortKeys[i]` atomically in one operation.
// MultiGet is identical to MultiGetOpt except that the former uses DefaultMultiGetOptions as `options`.
//
// If `sortKeys` are given empty or nil, all entries under `hashKey` will be retrieved.
// `hashKey` : CAN'T be nil or empty.
// `sortKeys[i]` : CAN'T be nil but CAN be empty.
//
// The returned key-value pairs are sorted by sort key in ascending order.
// Returns nil if no entries match.
// Returns true if all data is fetched, false if only partial data is fetched.
//
MultiGet(ctx context.Context, hashKey []byte, sortKeys [][]byte) ([]*KeyValue, bool, error)
MultiGetOpt(ctx context.Context, hashKey []byte, sortKeys [][]byte, options *MultiGetOptions) ([]*KeyValue, bool, error)
```
注:  
* 参数：需传入 `context`、`hashKey`、`sortKeys`。  
* 返回值：得到的 kvs、bool 值代表是否 all fetched, error  
* 异常：如果出现异常，譬如网络错误、超时错误、服务端错误等，可以访问 error 获取具体错误类型 (key 对应数据不存在不会报错)。  
* bool 值表示:如果用户指定了 `maxFetchCount` 或者 `maxFetchSize`，单次查询可能只获取到部分结果。如果所有满足条件的数据都已经获取到，则返回 `true`；否则返回 `false`。

``` go
// MultiGetOptions is the options for MultiGet and MultiGetRange, defaults to DefaultMultiGetOptions.
type MultiGetOptions struct {
    StartInclusive bool
    StopInclusive  bool
    SortKeyFilter  Filter

    // MaxFetchCount and MaxFetchSize limit the size of returned result.
    // Max count of k-v pairs to be fetched. MaxFetchCount <= 0 means no limit.
    MaxFetchCount int

    // Max size of k-v pairs to be fetched. MaxFetchSize <= 0 means no limit.
    MaxFetchSize int

    // Query order
    Reverse bool

    // Whether to retrieve keys only, without value.
    // Enabling this option will reduce the network load, improve the RPC latency.
    NoValue bool
}

// Filter is used to filter based on the key.
type Filter struct {
    Type    FilterType
    Pattern []byte
}

// Filter types
const (
    FilterTypeNoFilter      = FilterType(rrdb.FilterType_FT_NO_FILTER)
    FilterTypeMatchAnywhere = FilterType(rrdb.FilterType_FT_MATCH_ANYWHERE)
    FilterTypeMatchPrefix   = FilterType(rrdb.FilterType_FT_MATCH_PREFIX)
    FilterTypeMatchPostfix  = FilterType(rrdb.FilterType_FT_MATCH_POSTFIX)
)
```
注：  
* MultiGetOptions 说明：  
    * startInclusive: 是否包含 StartSortKey，默认为 `true`。  
    * stopInclusive: 是否包含 StopSortKey，默认为 `false`。  
    * SortKeyFilter: SortKey 过滤项  
    * maxFetchCount 和 maxFetchSize 用于限制读取的数据量，maxFetchCount 表示最多读取的数据条数，maxFetchSize 表示最多读取的数据字节数，两者任一达到限制就停止读取. MaxFetchCount 默认为 100, MaxFetchSize 默认为 100000  
    * noValue: 只返回 HashKey 和 SortKey，不返回 Value 数据，默认为false。  
    * reverse: 是否逆向扫描数据库，从后往前查找数据。但是查找得到的结果在list 中还是按照 SortKey 从小到大顺序存放。从 Pegasus Server 1.8.0 时开始支持。  
* Filter说明：  
    * type: 过滤类型，包括无过滤、任意位置匹配、前缀匹配和后缀匹配  
    * Pattern: 过滤模式串，空串相当于无过滤。
* Filter types 说明：    
    * FilterTypeNoFilter: 无过滤
    * FilterTypeMatchAnywhere: 任意位置匹配
    * FilterTypeMatchPrefix: 前缀匹配
    * FilterTypeMatchPostfix: 后缀匹配

### MultiGetRange and MultiGetRangeOpt
读**同一 HashKey 下**的多行数据，支持范围查询。

``` go
// MultiGetRange retrieves the multiple entries under `hashKey`, between range (`startSortKey`, `stopSortKey`),
// atomically in one operation.
//
// startSortKey: nil or len(startSortKey) == 0 means start from begin.
// stopSortKey: nil or len(stopSortKey) == 0 means stop to end.
// `hashKey` : CAN'T be nil.
//
// The returned key-value pairs are sorted by sort keys in ascending order.
// Returns nil if no entries match.
// Returns true if all data is fetched, false if only partial data is fetched.
MultiGetRange(ctx context.Context, hashKey []byte, startSortKey []byte, stopSortKey []byte) ([]*KeyValue, bool, error)
MultiGetRangeOpt(ctx context.Context, hashKey []byte, startSortKey []byte, stopSortKey []byte, options *MultiGetOptions) ([]*KeyValue, bool, error)
```

注：
* 参数：需传入 `context`、`hashKey`、`startSortKey`、`stopSortKey`  
* 返回值：`kvs`、`bool` 值代表是否 all fetched, error  
* 异常：如果出现异常，譬如网络错误、超时错误、服务端错误等，可以访问 error 获取具体错误类型 (key 对应数据不存在不会报错)。  


### MultiSet and MultiSetOpt
写**同一 HashKey 下**的多行数据。
``` go
// MultiSet sets the multiple entries for `hashKey` + `sortKeys[i]` atomically in one operation.
// `hashKey` / `sortKeys` / `values` : CAN'T be nil or empty.
// `sortKeys[i]` / `values[i]` : CAN'T be nil but CAN be empty.
MultiSet(ctx context.Context, hashKey []byte, sortKeys [][]byte, values [][]byte) error
MultiSetOpt(ctx context.Context, hashKey []byte, sortKeys [][]byte, values [][]byte, ttl time.Duration) error
```
注：
* `MultiSet` 调用了 rocksdb 的 WriteBatch 接口，因此 `MultiSet` 是一个原子操作
* 提供了两个版本的接口，其中第二个接口可以指定 TTL 时间。
* 参数：需传入 `context`、`hashKey`、`sortKeys`、`values`、`ttl` (可选，单位为 s)
* 返回值：error 
* 异常：如果出现异常，譬如网络错误、超时错误、服务端错误等，可以访问 error 获取具体错误类型
  
### MultiDel
``` go
// MultiDel deletes the multiple entries under `hashKey` all atomically in one operation.
// `hashKey` / `sortKeys` : CAN'T be nil or empty.
// `sortKeys[i]` : CAN'T be nil but CAN be empty.
MultiDel(ctx context.Context, hashKey []byte, sortKeys [][]byte) error
```
注：
* `MultiDel` 调用了 rocksdb 的 WriteBatch 接口，因此 `MultiDel` 是一个原子操作
* 参数：需传入 `context`、`hashKey`、`sortKeys`
* 返回值：error 
* 异常：如果出现异常，譬如网络错误、超时错误、服务端错误等，可以访问 error 获取具体错误类型

### DelRange and DelRangeOpt
``` go
// DelRange /DelRangeOpt deletes the multiple entries under `hashKey`, between range (`startSortKey`, `stopSortKey`),
// atomically in one operation.
// DelRange is identical to DelRangeOpt except that the former uses DefaultDelRangeOptions as `options`.
//
// startSortKey: nil or len(startSortKey) == 0 means to start from the first entry in the sorted key range.
// stopSortKey: nil or len(stopSortKey) == 0 means to stop at the last entry in the sorted key range.
// `hashKey` : CAN'T be nil or empty.
DelRange(ctx context.Context, hashKey []byte, startSortKey []byte, stopSortKey []byte) error
DelRangeOpt(ctx context.Context, hashKey []byte, startSortKey []byte, stopSortKey []byte, options *DelRangeOptions) error

// DelRangeOptions is the options for DelRange, defaults to DefaultDelRangeOptions.
type DelRangeOptions struct {
    nextSortKey    []byte
    StartInclusive bool
    StopInclusive  bool
    SortKeyFilter  Filter
}
```
注：
* `DelRange` 实际调用了多次 `MultiDel`, 每次 `MultiDel` 是原子的，但是 `DelRange` 整体可能不是原子的。
* 参数：需传入 `context`、`hashKey`、`startSortKey`、`stopSortKey`
* 返回值：error 
* 异常：如果出现异常，譬如网络错误、超时错误、服务端错误等，可以访问 error 获取具体错误类型
* `DelRangeOptions`:
    * `nextSortKey`: `DelRange` 会按照 sortkey 的大小顺序进行删除，假如删除过程中失败，会将未删除成功第一个 sortkey 保存在 `nextSortKey`
    * `StartInclusive`: 删除时是否包括 `startSortKey`
    * `StopInclusive`: 删除时是否包括 `stopSortKey`
    * `SortKeyFilter`: 可以对 Sortkey 进行筛选

### TTL
获取某个 key 的TTL。
``` go
// Returns ttl(time-to-live) in seconds: -1 if ttl is not set; -2 if entry doesn't exist.
// `hashKey` : CAN'T be nil or empty.
// `sortKey` : CAN'T be nil but CAN be empty.
TTL(ctx context.Context, hashKey []byte, sortKey []byte) (int, error)
```
注：
* 参数：需传入 `context`、`hashKey`、`sortKey`
* 返回值：`int` 代表 ttl 时间，单位为 s；`error` 代表异常信息
* 异常：如果出现异常，譬如网络错误、超时错误、服务端错误等，可以访问 error 获取具体错误类型	

### Exist
判断某个 key 是否存在。
``` go
// Check value existence for the entry for `hashKey` + `sortKey`.
// `hashKey`: CAN'T be nil or empty.
Exist(ctx context.Context, hashKey []byte, sortKey []byte) (bool, error)
```
注：
* 参数：需传入 `context`、`hashKey`、`sortKey`
* 返回值：`bool` 代表 key 是否存在；`error` 代表异常信息
* 异常：如果出现异常，譬如网络错误、超时错误、服务端错误等，可以访问 error 获取具体错误类型	

### GetScanner
获取遍历某个 HashKey 下所有数据的迭代器，用于局部扫描。
``` go
// Get Scanner for {startSortKey, stopSortKey} within hashKey.
// startSortKey: nil or len(startSortKey) == 0 means start from begin.
// stopSortKey: nil or len(stopSortKey) == 0 means stop to end.
// `hashKey`: CAN'T be nil or empty.
GetScanner(ctx context.Context, hashKey []byte, startSortKey []byte, stopSortKey []byte, options *ScannerOptions) (Scanner, error)

// ScannerOptions is the options for GetScanner and GetUnorderedScanners.
type ScannerOptions struct {
    BatchSize      int  // internal buffer batch size
    StartInclusive bool // if the startSortKey is included
    StopInclusive  bool // if the stopSortKey is included
    HashKeyFilter  Filter
    SortKeyFilter  Filter
    NoValue        bool // only fetch hash_key and sort_key, but not fetch value
}
```  
注：
* 参数: 需传入 `context`、`hashKey`、`startSortKey`、`stopSortKey`、`ScannerOptions`
    * `startSortKey` 和 `stopSortKey` 用于指定 scan 的返回，并通过 `ScannerOptions` 指定区间的开闭。
    * 如果 `startSortKey` 为 null，表示从头开始；如果 `stopSortKey` 为 null，表示一直读到尾。
    * `ScannerOptions` 说明:
        * `BatchSize`: 从 server 端读取数据时每批数据的个数，默认值为 1000
        * `StartInclusive`:是否包含 `startSortKey`，默认为 true
        * `StopInclusive`: 是否包含 `stopSortKey`，默认为 false
        * `HashKeyFilter`: hashkey 的筛选，默认无筛选
        * `SortKeyFilter`: sortkey 的筛选，默认无筛选
        * `NoValue`： 只返回 HashKey 和 SortKey，不返回 Value 数据，默认为 false
* 返回值：迭代器 `Scanner`、`error`
* 异常：如果出现异常，譬如网络错误、超时错误、服务端错误等，可以访问 error 获取具体错误类型	

### GetUnorderedScanners
获取遍历整个表的所有数据的迭代器，用于全局扫描。
``` go
// Get Scanners for all data in pegasus, the count of scanners will
// be no more than maxSplitCount
GetUnorderedScanners(ctx context.Context, maxSplitCount int, options *ScannerOptions) ([]Scanner, error)
```
注：
* 参数: 需传入 `context`、`maxSplitCount`、`ScannnerOptions`
    * `maxSplitCount`: 用于决定返回的迭代器的个数。当返回多个迭代器时，每个迭代器可以访问表中的部分数据。通过返回迭代器列表，用户可以进行并发scan 或者在 MapReduce 中使用。如果不需要多个迭代器，可以将其设置为1。
* 返回值：迭代器 Scanner 数组, error
* 异常：如果出现异常，譬如网络错误、超时错误、服务端错误等，可以访问 error 获取具体错误类型

### Next
在 scan 操作时，同步获取下一条数据。
``` go
// Scanner defines the interface of client-side scanning.
type Scanner interface {
    // Grabs the next entry.
    Next(ctx context.Context) (completed bool, hashKey []byte, sortKey []byte, value []byte, err error)

    Close() error
}
```
注：
* 参数: 需传入 `context`
* 返回值：`completed`、`hashKey`、`sortKey`、`value`、`err`
    * `completed`: `true` 表示遍历结束.
* 异常：如果出现异常，譬如网络错误、超时错误、服务端错误等，可以访问 error 获取具体错误类型

### CheckAndSet  
单 hashKey 数据的原子 CAS 操作（可以理解为单行原子操作）。详细说明参见[单行原子操作](/api/single-atomic#cas操作)。  
该操作先对某个 SortKey（称之为 checkSortKey）的 value 做条件检查：    
* 如果检查的条件满足，则将另一个 SortKey（称之为 setSortKey）的 value 设置为新值。  
* 如果检查的条件不满足，则不执行 set 操作。    

`checkSortKey` 和 `setSortKey` 可以相同也可以不同。  
用户还可以设置 `CheckAndSetOptions.ReturnCheckValue` 来获取 `CheckSortKey` 对应的 value。如果 `CheckSortKey` 和 `SetSortKey` 相同并且 set 成功，则获取 set 之前的旧值。

``` go
// Atomically check and set value by key from the cluster. The value will be set if and only if check passed.
// The sort key for checking and setting can be the same or different.
//
// `checkSortKey`: The sort key for checking.
// `setSortKey`: The sort key for setting.
// `checkOperand`:
CheckAndSet(ctx context.Context, hashKey []byte, checkSortKey []byte, checkType CheckType,
    checkOperand []byte, setSortKey []byte, setValue []byte, options *CheckAndSetOptions) (*CheckAndSetResult, error)

// The value checking types
const (
    CheckTypeNoCheck = CheckType(rrdb.CasCheckType_CT_NO_CHECK)

    // existence
    CheckTypeValueNotExist        = CheckType(rrdb.CasCheckType_CT_VALUE_NOT_EXIST)          // value is 	not exist
    CheckTypeValueNotExistOrEmpty = CheckType(rrdb.CasCheckType_CT_VALUE_NOT_EXIST_OR_EMPTY) // value is 	not exist or value is empty
    CheckTypeValueExist           = CheckType(rrdb.CasCheckType_CT_VALUE_EXIST)              // value is 	exist
    CheckTypeValueNotEmpty        = CheckType(rrdb.CasCheckType_CT_VALUE_NOT_EMPTY)          // value is 	exist and not empty

    // match
    CheckTypeMatchAnywhere = CheckType(rrdb.CasCheckType_CT_VALUE_MATCH_ANYWHERE) // operand matches 	anywhere in value
    CheckTypeMatchPrefix   = CheckType(rrdb.CasCheckType_CT_VALUE_MATCH_PREFIX)   // operand matches 	prefix in value
    CheckTypeMatchPostfix  = CheckType(rrdb.CasCheckType_CT_VALUE_MATCH_POSTFIX)  // operand matches 	postfix in value

    // bytes compare
    CheckTypeBytesLess           = CheckType(rrdb.CasCheckType_CT_VALUE_BYTES_LESS)             // bytes 	compare: value < operand
    CheckTypeBytesLessOrEqual    = CheckType(rrdb.CasCheckType_CT_VALUE_BYTES_LESS_OR_EQUAL)    // bytes 	compare: value <= operand
    CheckTypeBytesEqual          = CheckType(rrdb.CasCheckType_CT_VALUE_BYTES_EQUAL)            // bytes 	compare: value == operand
    CheckTypeBytesGreaterOrEqual = CheckType(rrdb.CasCheckType_CT_VALUE_BYTES_GREATER_OR_EQUAL) // bytes 	compare: value >= operand
    CheckTypeBytesGreater        = CheckType(rrdb.CasCheckType_CT_VALUE_BYTES_GREATER)          // bytes 	compare: value > operand

    // int compare: first transfer bytes to int64; then compare by int value
    CheckTypeIntLess           = CheckType(rrdb.CasCheckType_CT_VALUE_INT_LESS)             // int 	compare: value < operand
    CheckTypeIntLessOrEqual    = CheckType(rrdb.CasCheckType_CT_VALUE_INT_LESS_OR_EQUAL)    // int 	compare: value <= operand
    CheckTypeIntEqual          = CheckType(rrdb.CasCheckType_CT_VALUE_INT_EQUAL)            // int 	compare: value == operand
    CheckTypeIntGreaterOrEqual = CheckType(rrdb.CasCheckType_CT_VALUE_INT_GREATER_OR_EQUAL) // int 	compare: value >= operand
    CheckTypeIntGreater        = CheckType(rrdb.CasCheckType_CT_VALUE_BYTES_GREATER)        // int 	compare: value > operand
)

// CheckAndSetOptions is the options of a CAS.
type CheckAndSetOptions struct {
    SetValueTTLSeconds int  // time to live in seconds of the set value, 0 means no ttl.
    ReturnCheckValue   bool // if return the check value in results.
}

// CheckAndSetResult is the result of a CAS.
type CheckAndSetResult struct {
    // true if set value succeed.
    SetSucceed bool

    // the actual value if set value failed; null means the actual value is not exist.
    CheckValue []byte

    // if the check value is exist; can be used only when checkValueReturned is true.
    CheckValueExist bool

    // return the check value if exist; can be used only when checkValueExist is true.
    CheckValueReturned bool
}
```
注：
* 参数：需传入 `context`、`hashKey`、`checkSortKey`、`checkType`、`checkOperand`、`setSortKey`、`setValue`、`CheckAndSetOptions`
    * `checkSortKey`、`checkType`、`checkOperand`：用于指定检查的条件。
    * `setSortKey`、`setValue`：用于指定条件检查成功后要 set 的新值。
    * `options`：其他选项，包括：
        * `SetValueTTLSeconds`：新值的 TTL 时间；TTL 必须 >= 0，0 表示不设置 TTL 限制。当 < 0 时返回报错。
        * `ReturnCheckValue`：是否需要返回 `CheckSortKey` 对应的 value。
* 返回值：`CheckAndSetResult`、`error`
    * `SetSucceed`: 是否 set 成功。
    * `CheckValue`: `CheckSortKey` 对应的 value 值；该域只有在 `CheckValueExist` 为 `true` 时有意义。
    * `CheckValueExist`: `CheckSortKey` 对应的 value 是否存在；该域只有在 `ReturnCheckValue` 为 `true` 时有意义。
    * `ReturnCheckValue`: 是否返回了 `CheckSortKey` 对应的 value。
* 异常：如果出现异常，譬如网络错误、超时错误、服务端错误等，可以访问 error 获取具体错误类型

### SortKeyCount
获取某个 HashKey 下所有 SortKey 的个数。
``` go
// Returns the count of sortkeys under hashkey.
// `hashKey`: CAN'T be nil or empty.
SortKeyCount(ctx context.Context, hashKey []byte) (int64, error)
```
注：
* 参数：需传入 `context`、`hashKey`
* 返回值：返回 `HashKey` 下所有 `SortKey` 的个数
* 异常：如果出现异常，譬如网络错误、超时错误、服务端错误等，可以访问 error 获取具体错误类型
  
### Incr
单行原子增(减)操作。详细说明参见[单行原子操作](/api/single-atomic#cas操作)。  
该操作先将 key 所指向的 value 的字节串转换为 int64 类型, 然后加上 increment，将结果转换为字节串设置为新值。
当参数 increment 为正数时，即原子加；当参数 increment 为负数时，即原子减。
``` go
// Atomically increment value by key from the cluster.
// Returns the new value.
// `hashKey` / `sortKeys` : CAN'T be nil or empty
Incr(ctx context.Context, hashKey []byte, sortKey []byte, increment int64) (int64, error)
```
注：
* 参数：需传入 `context`、`hashKey`、`sortKey`、`increment`
* 返回值：操作成功后的新值、error
* 异常：如果出现异常，譬如网络错误、超时错误、服务端错误等，可以访问 error 获取具体错误类型。另外以下情况也会抛出异常：
    * 旧值转换为 int64 时出错，譬如不是合法的数字或者超出 int64 范围。
    * 旧值加上 increment 后的结果超出 int64 范围。
* 其他说明：
    * 如果旧值不存在，则把旧值当做 0 处理，即新值等于 increment。
    * TTL 语义：如果旧值存在，新值的 TTL 和旧值保持一致；如果旧值不存在，新值将不设 TTL。
  
### BatchGet
读取一批数据，对 get 函数的批量封装。该函数并发地向 server 发送异步请求，并等待结果。如果有任意一个请求失败，就提前终止并抛出异常。如果抛出了异常，则 values 中的结果是未定义的。
``` go
// Gets values from a batch of CompositeKeys. Internally it distributes each key
// into a Get call and wait until all returned.
//
// `keys`: CAN'T be nil or empty, `hashkey` in `keys` can't be nil or empty either.
// The returned values are in sequence order of each key, aka `keys[i] => values[i]`.
// If keys[i] is not found, or the Get failed, values[i] is set nil.
//
// Returns a non-nil `err` once there's a failed Get call. It doesn't mean all calls failed.
//
// NOTE: this operation is not guaranteed to be atomic
BatchGet(ctx context.Context, keys []CompositeKey) (values [][]byte, err error)
```
注：
* 参数：需传入 `context`、`keys`
* 返回值：`values`、`error`。如果读取成功，`values[i]` 中存放 `keys[i]` 对应的结果，如果 value 不存在则为 `nil`。
* 异常：如果出现异常，譬如网络错误、超时错误、服务端错误等，可以访问 `error` 获取具体错误类型。
* 其他说明：
    * 该方法不是原子的，有可能出现部分成功部分失败的情况，只要任意一个失败都会抛出异常。
