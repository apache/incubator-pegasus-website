---
permalink: administration/hotspot-detection
---

# Background
Pegasus is a distributed storage system that shards data using `Hash` partitioning. Normally, traffic is evenly distributed across all nodes in the cluster. However, in extreme cases such as improper `Hashkey` design, hotspot events/users, or business logic errors, individual Pegasus nodes may experience excessive load, affecting overall service availability. Therefore, we designed a hotspot detection solution to help operators promptly identify hotspot issues and locate hotspot traffic.

# Hot Partition Detection

## Design and Implementation
Pegasus server consists of three main components: Meta, Replica, and Collector. The Collector is responsible for fetching metrics from Replica and reporting them to the monitoring platform, as well as cluster availability detection.

In this feature, the Collector periodically collects read/write traffic metrics from each partition in the cluster for analysis. It calculates the [Z-score](https://en.wikipedia.org/wiki/Standard_score) for each partition by comparing historical data vertically and concurrent data horizontally to describe the hotspot status. When `enable_hotkey_auto_detect` is enabled, the Collector will automatically send [Hotkey Detection](#hotkey-detection) requests to hot partitions to identify abnormal hotspot traffic and report results to the monitoring platform (Falcon).

## Usage Example
Add the following configurations to the config file and restart the Collector:
```shell
[pegasus.collector]
# Enable automatic hotkey detection. When a hot partition is confirmed,
# the Collector will send hotkey detection requests to the corresponding partition
enable_hotkey_auto_detect = true

# Hot partition threshold (Z-score) is 3. This can be understood as the algorithm's sensitivity.
# Partitions exceeding this threshold will be identified as hot partitions.
# In testing, we found a threshold of 3 to be reasonable.
hot_partition_threshold = 3

# When a partition is identified as hot for more than this count, automatic hotkey detection will be triggered.
occurrence_threshold = 100
```

## Related Metrics

In Falcon, you can check if target machines have hotspots using this metric. `hotkey_type` can be `read` or `write`, representing read/write hotspots respectively.

```
app.stat.hotspots@{app_name}.{hotkey_type}.{partition_count}
```

# Hotkey Detection
## Design Principle
This feature identifies specific `Hashkey`s causing partition hotspots. When receiving a hotkey detection request, the Replica will record and analyze traffic for a period to identify hotspot traffic. If no hotspot is found within the cycle, collection will automatically stop.

## Usage Example
**Start hotkey detection**

You need to specify the `app_id`, partition number, hotspot type, and target node address:
```
>>> detect_hotkey -a 3 -p 1 -t write -c start -d 10.231.57.104:34802
Detect hotkey rpc is starting, use 'detect_hotkey -a 3 -p 1 -t write -c query -d 10.231.57.104:34802' to get the result later
```

**Query hotkey detection result**

When detection is still in progress:
```
>>> detect_hotkey -a 3 -p 2 -t write -c query -d 10.231.57.104:34802
Hotkey detection performed failed, in 584.78, error_hint:ERR_BUSY Can't get hotkey now, now state: hotkey_collector_state::COARSE_DETECTING
>>> detect_hotkey -a 3 -p 2 -t write -c query -d 10.231.57.104:34802
Hotkey detection performed failed, in 584.78, error_hint:ERR_BUSY Can't get hotkey now, now state: hotkey_collector_state::FINE_DETECTING
```

When successfully detecting hotkey `hashkey = Thisishotkey1`:
```
>>> detect_hotkey -a 3 -p 2 -t write -c query -d 10.231.57.104:34802
Find write hotkey in 3.2 result:\"Thisishotkey1\"
```

When no hotspot is detected within the cycle:
```
>>> detect_hotkey -a 3 -p 2 -t write -c query -d 10.231.57.104:34803
Hotkey detect rpc performed failed, in 3.2, error_hint:ERR_BUSY Can't get hotkey now, now state: hotkey_collector_state::STOPPED
```

**Stop hotkey detection**
```
>>> detect_hotkey -a 3 -p 2 -t write -c stop -d 10.231.57.104:34803
Detect hotkey rpc is stopped now
```
Note: Whether detection succeeds or fails, you must `stop` the current detection before starting a new one.

## Related Configurations
```shell
[pegasus.server]
# Threshold for coarse-grained hotkey detection (inversely proportional to sensitivity)
hot_key_variance_threshold = 5
# Threshold for fine-grained hotkey detection (inversely proportional to sensitivity)
hot_bucket_variance_threshold = 7
# Set to negative value, generally not recommended to modify
hotkey_buckets_num = 37
# Maximum duration for a single detection
max_seconds_to_detect_hotkey = 150
# Collection time interval for each detection cycle
hotkey_analyse_time_interval_s = 10
