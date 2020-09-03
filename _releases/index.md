---
title: Release History of Pegasus
layout: releases
show_sidebar: false
toc: false
content-toc: true
content-toc-title: Releases
---

# Release Notes of v2.0.0 (Latest)

Release page on Github: <https://github.com/XiaoMi/pegasus/releases/tag/v2.0.0>

**NOTE: 2.0.0 is backward-compatible only, which means servers upgraded to this version can't rollback to previous versions.**

The following are the highlights in this release:

## Duplication

Duplication is the solution of Pegasus for intra-cluster data copying in real-time. We currently limit our master-master duplication for 'PUT' and 'MULTI_PUT' only. See this document for more details:
<https://pegasus.apache.org/administration/duplication>

## Backup Request

Backup Request is a way to eliminate tail latency by sacrificing minor data consistency, fallback reading from a random secondary when the primary read failed to finish at the expected time.
See the discussion here: <https://github.com/XiaoMi/pegasus/issues/251>

## RocksDB Meta CF

Pegasus currently has a hacked version of RocksDB that stores a few metadata in the manifest file, which makes our RocksDB incompatible with the official version. In this version, we exploit an additional column family (called 'Meta CF') to store those metadata.

To finally get rid of the legacy RocksDB, you must first upgrade the ReplicaServer to 2.0.0.

## Bloom Filter Optimization

This time we support metrics for the utilization of bloom filters in Pegasus. And for critical scenarios, we provide configurations for performance tuning on bloom filters.
See [#522](https://github.com/XiaoMi/pegasus/pull/522), [#521](https://github.com/XiaoMi/pegasus/pull/521).

## Cold-Backup FDS Limit

This feature adds throttling on download and upload during cold-backup.
See [XiaoMi/rdsn#443](https://github.com/XiaoMi/rdsn/pull/443).

## Adding Node Optimization

We previously suffer from the effect brought by data migration when adding one or more nodes into a cluster. In some latency-critical scenarios (here we mostly focus on read-latency) this (3~10 times increase in latency) usually implies the service briefly unavailable.

In 2.0.0 we support a strategy that the newly added nodes do not serve read requests until most migrations are done. Although the new nodes still participate in write-2PC and the overall migration workload doesn't decrease, the read latency significantly improved thanks to this job.

Be aware that this feature requires merely pegasus-tools to be 2.0.0, you don't have to upgrade the server to 2.0.0. See [#528](https://github.com/XiaoMi/pegasus/pull/528).

# Release Notes of v1.12.3

Release page on Github: <https://github.com/XiaoMi/pegasus/releases/tag/v1.12.3>

<button class="button release-button" data-target="#modal_v1_12_3">Released at 23/Apr/2020</button>


# Release Notes of v1.12.2

Release page on Github: <https://github.com/XiaoMi/pegasus/releases/tag/v1.12.2>

<button class="button release-button" data-target="#modal_v1_12_2">Released at 2/Jan/2020</button>


# Release Notes of v1.12.1

Release page on Github: <https://github.com/XiaoMi/pegasus/releases/tag/v1.12.1>

<button class="button release-button" data-target="#modal_v1_12_1">Released at 4/Dec/2019</button>

# Release Notes of v1.12.0

Release page on Github: <https://github.com/XiaoMi/pegasus/releases/tag/v1.12.0>

<button class="button release-button" data-target="#modal_v1_12_0">Released at 19/Nov/2019</button>

# Release Notes of v1.11.6

Release page on Github: <https://github.com/XiaoMi/pegasus/releases/tag/v1.11.6>

<button class="button release-button" data-target="#modal_v1_11_6">Released at 26/Aug/2019</button>

# Release Notes of v1.11.5

Release page on Github: <https://github.com/XiaoMi/pegasus/releases/tag/v1.11.5>

<button class="button release-button" data-target="#modal_v1_11_5">Released at 24/Jun/2019</button>

# Release Notes of v1.11.4

Release page on Github: <https://github.com/XiaoMi/pegasus/releases/tag/v1.11.4>

<button class="button release-button" data-target="#modal_v1_11_4">Released at 10/Jun/2019</button>

# Other Releases

For earlier releases, please refer to <https://github.com/XiaoMi/pegasus/releases>.
