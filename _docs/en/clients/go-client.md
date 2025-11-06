---
permalink: clients/go-client
---
 
# Get the Go Client

Download:

```bash
go get github.com/apache/incubator-pegasus/go-client@<CommitId>
# Example
go get github.com/apache/incubator-pegasus/go-client@df0eb5a
```

Requirements:
- Go 1.18+
- Thrift 0.13

# Client Configuration
Creating a Go client instance requires configuration. Currently, only parameter passing is supported.
The configuration is simple — you only need to specify the meta servers.
If you prefer file-based configuration, parse your config file yourself and pass the parameters to the Go client.

```go
// Parameter configuration
cfg := &pegasus.Config{
    MetaServers: []string{"0.0.0.0:34601", "0.0.0.0:34601"},
}
c := pegasus.NewClient(*cfg)

// File configuration
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

# API Reference

## Create Client instance
```go
// NewClient creates a new instance of pegasus client.
// It panics if the configured addresses are illegal
func NewClient(cfg Config) Client

// Config is the configuration of pegasus client.
type Config struct {
    MetaServers []string `json:"meta_servers"`
}
```

After using the client, remember to close it to release resources, for example:
```go
c := pegasus.NewClient(*cfg)

...

c.Close()
```

## Create TableConnector instance
All data operations are defined in `TableConnector`.
One client can open multiple `TableConnector` instances, each corresponding to a table.
```go
// Open the specific pegasus table. If the table was opened before,
// it will reuse the previous connection to the table.
OpenTable(ctx context.Context, tableName string) (TableConnector, error)
```

## TableConnector API

### Get
Read a single row.
```go
// Get retrieves the entry for `hashKey` + `sortKey`.
// Returns nil if no entry matches.
// `hashKey` : CAN'T be nil or empty.
// `sortKey` : CAN'T be nil but CAN be empty.
Get(ctx context.Context, hashKey []byte, sortKey []byte) ([]byte, error)
```
Notes:
- Parameters: `context`, `hashKey`, `sortKey`.
- Returns: `value`, `error`. If `(nil, nil)` is returned, the key does not exist.
- Errors: network error, timeout, server error, etc. If the key does not exist, `value` is nil without error.

### Set and SetTTL
Write a single row. `SetTTL` sets TTL for a single key-value.
```go
// Set the entry for `hashKey` + `sortKey` to `value`.
// If Set is called or `ttl` == 0, no data expiration is specified.
// `hashKey` : CAN'T be nil or empty.
// `sortKey` / `value` : CAN'T be nil but CAN be empty.
Set(ctx context.Context, hashKey []byte, sortKey []byte, value []byte) error
SetTTL(ctx context.Context, hashKey []byte, sortKey []byte, value []byte, ttl time.Duration) error
```
Notes:
- Two interfaces are provided; the second allows specifying TTL time (in seconds).
- Parameters: `context`, `hashKey`, `sortKey`, `value`, `ttl`.
- Returns: `error`.
- Errors: network error, timeout, server error, etc.

### Del
Delete a single row.
```go
// Delete the entry for `hashKey` + `sortKey`.
// `hashKey` : CAN'T be nil or empty.
// `sortKey` : CAN'T be nil but CAN be empty.
Del(ctx context.Context, hashKey []byte, sortKey []byte) error
```
Notes:
- Parameters: `context`, `hashKey`, `sortKey`.
- Errors: network error, timeout, server error, etc.

### MultiGet and MultiGetOpt
Read multiple rows under the same HashKey.
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
Notes:
- Parameters: `context`, `hashKey`, `sortKeys`.
- Returns: `kvs`, `bool` indicating whether all data fetched, `error`.
- Errors: network error, timeout, server error, etc. If the key does not exist, it does not report an error.
- The `bool` indicates: if `maxFetchCount` or `maxFetchSize` is set, a single query may return only part of the result. If all data satisfying the conditions are fetched, returns `true`; otherwise `false`.

```go
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
Notes:
- MultiGetOptions:
  - startInclusive: whether to include StartSortKey, default `true`.
  - stopInclusive: whether to include StopSortKey, default `false`.
  - SortKeyFilter: filter on sort key.
  - maxFetchCount and maxFetchSize limit the amount of data read; maxFetchCount is the maximum number of entries; maxFetchSize is the maximum bytes. Stop reading once either is reached. Defaults: `maxFetchCount=100`, `maxFetchSize=100000`.
  - noValue: only returns HashKey and SortKey, without Value, default `false`.
  - reverse: scan in reverse order. Results are still sorted ascending by sort key within the returned list. Supported since Pegasus Server 1.8.0.
- Filter:
  - type: filtering type: no filter, match anywhere, match prefix, match postfix.
  - Pattern: filtering pattern. Empty is equivalent to no filter.
- Filter types description:
  - FilterTypeNoFilter: no filter
  - FilterTypeMatchAnywhere: match anywhere
  - FilterTypeMatchPrefix: prefix match
  - FilterTypeMatchPostfix: postfix match

### MultiGetRange and MultiGetRangeOpt
Read multiple rows under the same HashKey with range query.
```go
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
Notes:
- Parameters: `context`, `hashKey`, `startSortKey`, `stopSortKey`.
- Returns: `kvs`, `bool` indicating whether all data fetched, `error`.
- Errors: network error, timeout, server error, etc. If the key does not exist, it does not report an error.

### MultiSet and MultiSetOpt
Write multiple rows under the same HashKey.
```go
// MultiSet sets the multiple entries for `hashKey` + `sortKeys[i]` atomically in one operation.
// `hashKey` / `sortKeys` / `values` : CAN'T be nil or empty.
// `sortKeys[i]` / `values[i]` : CAN'T be nil but CAN be empty.
MultiSet(ctx context.Context, hashKey []byte, sortKeys [][]byte, values [][]byte) error
MultiSetOpt(ctx context.Context, hashKey []byte, sortKeys [][]byte, values [][]byte, ttl time.Duration) error
```
Notes:
- `MultiSet` uses RocksDB `WriteBatch`, so it is atomic.
- Two interfaces are provided; the second allows specifying TTL.
- Parameters: `context`, `hashKey`, `sortKeys`, `values`, `ttl` (optional, seconds).
- Returns: `error`.
- Errors: network error, timeout, server error, etc.

### MultiDel
```go
// MultiDel deletes the multiple entries under `hashKey` all atomically in one operation.
// `hashKey` / `sortKeys` : CAN'T be nil or empty.
// `sortKeys[i]` : CAN'T be nil but CAN be empty.
MultiDel(ctx context.Context, hashKey []byte, sortKeys [][]byte) error
```
Notes:
- `MultiDel` uses RocksDB `WriteBatch`, so it is atomic.
- Parameters: `context`, `hashKey`, `sortKeys`.
- Returns: `error`.
- Errors: network error, timeout, server error, etc.

### DelRange and DelRangeOpt
```go
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
Notes:
- `DelRange` internally calls `MultiDel` multiple times. Each `MultiDel` is atomic, but the overall `DelRange` may not be atomic.
- Parameters: `context`, `hashKey`, `startSortKey`, `stopSortKey`.
- Returns: `error`.
- Errors: network error, timeout, server error, etc.
- `DelRangeOptions`:
  - `nextSortKey`: deletion proceeds in ascending order of sort keys. If deletion fails midway, the first undeleted sort key is saved into `nextSortKey`.
  - `StartInclusive`: whether to include `startSortKey`.
  - `StopInclusive`: whether to include `stopSortKey`.
  - `SortKeyFilter`: filter sort keys.

### TTL
Get TTL of a key.
```go
// Returns ttl(time-to-live) in seconds: -1 if ttl is not set; -2 if entry doesn't exist.
// `hashKey` : CAN'T be nil or empty.
// `sortKey` : CAN'T be nil but CAN be empty.
TTL(ctx context.Context, hashKey []byte, sortKey []byte) (int, error)
```
Notes:
- Parameters: `context`, `hashKey`, `sortKey`.
- Returns: `int`, `error`.
- Errors: network error, timeout, server error, etc.

### Exist
Check whether a key exists.
```go
// Check value existence for the entry for `hashKey` + `sortKey`.
// `hashKey`: CAN'T be nil or empty.
Exist(ctx context.Context, hashKey []byte, sortKey []byte) (bool, error)
```
Notes:
- Parameters: `context`, `hashKey`, `sortKey`.
- Returns: `bool`, `error`.
- Errors: network error, timeout, server error, etc.

### GetScanner
Get an iterator to scan all data under a HashKey (local scan).
```go
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
Notes:
- Parameters: `context`, `hashKey`, `startSortKey`, `stopSortKey`, `ScannerOptions`.
  - `startSortKey` and `stopSortKey` specify the range; use `ScannerOptions` to configure open/closed intervals.
  - If `startSortKey` is nil, start from the beginning; if `stopSortKey` is nil, scan to the end.
- `ScannerOptions`:
  - `BatchSize`: number of entries per batch fetched from server, default 1000.
  - `StartInclusive`: whether to include `startSortKey`, default `true`.
  - `StopInclusive`: whether to include `stopSortKey`, default `false`.
  - `HashKeyFilter`: filter on hash key, default none.
  - `SortKeyFilter`: filter on sort key, default none.
  - `NoValue`: return only hash and sort keys without values, default `false`.
- Returns: `Scanner`, `error`.
- Errors: network error, timeout, server error, etc.

### GetUnorderedScanners
Get iterators to scan the entire table (global scan).
```go
// Get Scanners for all data in pegasus, the count of scanners will
// be no more than maxSplitCount
GetUnorderedScanners(ctx context.Context, maxSplitCount int, options *ScannerOptions) ([]Scanner, error)
```
Notes:
- Parameters: `context`, `maxSplitCount`, `ScannerOptions`.
  - `maxSplitCount` determines the number of returned iterators. When multiple iterators are returned, each can access a portion of the table. This enables concurrent scanning or use in MapReduce. Set to 1 if multiple iterators are not needed.
- Returns: array of `Scanner`, `error`.
- Errors: network error, timeout, server error, etc.

### Next
Fetch the next entry during scan.
```go
// Scanner defines the interface of client-side scanning.
type Scanner interface {
    // Grabs the next entry.
    Next(ctx context.Context) (completed bool, hashKey []byte, sortKey []byte, value []byte, err error)

    Close() error
}
```
Notes:
- Parameters: `context`.
- Returns: `completed`, `hashKey`, `sortKey`, `value`, `err`.
  - `completed`: `true` indicates scan finished.
- Errors: network error, timeout, server error, etc.

### CheckAndSet
Atomic CAS (Compare-And-Swap) on data under a single HashKey (single-row atomic operation). See [Single Row Atomic Operations](/api/single-atomic).
This operation first checks the value of a SortKey (`checkSortKey`) against some condition:
- If the condition is met, set the value of another SortKey (`setSortKey`) to the new value.
- If the condition is not met, do not perform the set operation.

`checkSortKey` and `setSortKey` can be identical or different.
You can set `CheckAndSetOptions.ReturnCheckValue` to return the value of `checkSortKey`. If `checkSortKey` and `setSortKey` are the same and the set succeeds, the returned value is the old value before setting.

```go
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
    CheckTypeValueNotExist        = CheckType(rrdb.CasCheckType_CT_VALUE_NOT_EXIST)          // value is  not exist
    CheckTypeValueNotExistOrEmpty = CheckType(rrdb.CasCheckType_CT_VALUE_NOT_EXIST_OR_EMPTY) // value is  not exist or value is empty
    CheckTypeValueExist           = CheckType(rrdb.CasCheckType_CT_VALUE_EXIST)              // value is  exist
    CheckTypeValueNotEmpty        = CheckType(rrdb.CasCheckType_CT_VALUE_NOT_EMPTY)          // value is  exist and not empty

    // match
    CheckTypeMatchAnywhere = CheckType(rrdb.CasCheckType_CT_VALUE_MATCH_ANYWHERE) // operand matches  anywhere in value
    CheckTypeMatchPrefix   = CheckType(rrdb.CasCheckType_CT_VALUE_MATCH_PREFIX)   // operand matches  prefix in value
    CheckTypeMatchPostfix  = CheckType(rrdb.CasCheckType_CT_VALUE_MATCH_POSTFIX)  // operand matches  postfix in value

    // bytes compare
    CheckTypeBytesLess           = CheckType(rrdb.CasCheckType_CT_VALUE_BYTES_LESS)             // bytes  compare: value < operand
    CheckTypeBytesLessOrEqual    = CheckType(rrdb.CasCheckType_CT_VALUE_BYTES_LESS_OR_EQUAL)    // bytes  compare: value <= operand
    CheckTypeBytesEqual          = CheckType(rrdb.CasCheckType_CT_VALUE_BYTES_EQUAL)            // bytes  compare: value == operand
    CheckTypeBytesGreaterOrEqual = CheckType(rrdb.CasCheckType_CT_VALUE_BYTES_GREATER_OR_EQUAL) // bytes  compare: value >= operand
    CheckTypeBytesGreater        = CheckType(rrdb.CasCheckType_CT_VALUE_BYTES_GREATER)          // bytes  compare: value > operand

    // int compare: first transfer bytes to int64; then compare by int value
    CheckTypeIntLess           = CheckType(rrdb.CasCheckType_CT_VALUE_INT_LESS)             // int  compare: value < operand
    CheckTypeIntLessOrEqual    = CheckType(rrdb.CasCheckType_CT_VALUE_INT_LESS_OR_EQUAL)    // int  compare: value <= operand
    CheckTypeIntEqual          = CheckType(rrdb.CasCheckType_CT_VALUE_INT_EQUAL)            // int  compare: value == operand
    CheckTypeIntGreaterOrEqual = CheckType(rrdb.CasCheckType_CT_VALUE_INT_GREATER_OR_EQUAL) // int  compare: value >= operand
    CheckTypeIntGreater        = CheckType(rrdb.CasCheckType_CT_VALUE_BYTES_GREATER)        // int  compare: value > operand
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
Notes:
- Parameters: `context`, `hashKey`, `checkSortKey`, `checkType`, `checkOperand`, `setSortKey`, `setValue`, `CheckAndSetOptions`.
  - `checkSortKey`, `checkType`, `checkOperand`: specify the check condition.
  - `setSortKey`, `setValue`: specify the new value to set once the condition passes.
  - `options`:
    - `SetValueTTLSeconds`: TTL of the new value; must be `>= 0`, `0` means no TTL; `< 0` returns error.
    - `ReturnCheckValue`: whether to return the value of `checkSortKey`.
- Returns: `CheckAndSetResult`, `error`.
  - `SetSucceed`: whether set succeeded.
  - `CheckValue`: value of `checkSortKey`; meaningful only when `checkValueExist = true`.
  - `CheckValueExist`: whether `checkSortKey` exists; meaningful only when `checkValueReturned = true`.
  - `CheckValueReturned`: whether `checkSortKey` value was returned.
- Errors: network error, timeout, server error, etc.

### SortKeyCount
Get the number of sort keys under a HashKey.
```go
// Returns the count of sortkeys under hashkey.
// `hashKey`: CAN'T be nil or empty.
SortKeyCount(ctx context.Context, hashKey []byte) (int64, error)
```
Notes:
- Parameters: `context`, `hashKey`.
- Returns: the count of sort keys under the HashKey.
- Errors: network error, timeout, server error, etc.

### Incr
Atomic increment/decrement on a single row. See [Single Row Atomic Operations](/api/single-atomic).
This operation reads the value as a byte string, converts it to `int64`, adds `increment`, converts the result back to a byte string, and sets it as the new value.
When `increment` is positive, it is atomic increment; when negative, atomic decrement.
```go
// Atomically increment value by key from the cluster.
// Returns the new value.
// `hashKey` / `sortKeys` : CAN'T be nil or empty
Incr(ctx context.Context, hashKey []byte, sortKey []byte, increment int64) (int64, error)
```
Notes:
- Parameters: `context`, `hashKey`, `sortKey`, `increment`.
- Returns: new value after operation, `error`.
- Errors: network error, timeout, server error, etc. Also errors in the following cases:
  - Old value cannot be converted to `int64` (invalid number or overflow).
  - Result of old value plus `increment` overflows `int64`.
- Other:
  - If old value does not exist, treat it as `0`, so new value equals `increment`.
  - TTL: If old value exists, new value keeps the same TTL as old; if old value does not exist, new value has no TTL.

### BatchGet
Read a batch of keys; a batched wrapper of `Get`. This method concurrently sends asynchronous requests to the server and waits for results. If any request fails, it aborts early and returns error. When error is returned, `values` are undefined.
```go
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
Notes:
- Parameters: `context`, `CompositeKey`.
- Returns: `values`, `error`. If read succeeds, `values[i]` holds the result for `keys[i]`; if value does not exist, it is `nil`.
- Errors: network error, timeout, server error, etc.
- Other:
  - This method is not atomic; partial success and partial failure may occur. An error is returned if any call fails.