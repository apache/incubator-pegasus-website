---
title: Pegasus Proposal
layout: page
---

## Abstract

Pegasus is a distributed key-value storage system which is designed to
be scalable, strong consistent and efficient.

## Background

HBase used to be the only large scale KV store solution in XiaoMi,
until Pegasus came out in 2015 to solve the problem of high latency
of HBase because of its Java GC and RPC overhead of the distributed filesystem.

Pegasus targets to fill the gap between Redis and HBase. As the former
is in-memory, low latency, but does not provide strong-consistency guarantee.
And unlike the latter, Pegasus is completely written in C++ and its write path
relies merely on the local filesystem.

Apart from the performance requirements, we also need the abilities of our
storage system to ensure multiple-level data safety, fast data migration between data centers,
online load balancing and partition split.

After investigating the existing storage systems in the open-source world,
we could hardly find a suitable solution to satisfy all the requirements.
So the journey of Pegasus begins.

## Proposal

We propose to contribute the Pegasus codebase and associated artifacts
(e.g. documentation, web-site content etc.) to the Apache Software Foundation,
and aim to build an open community around Pegasus’s continued development
in the ‘Apache Way’.

### Overview of Pegasus

Pegasus’s implementation consists of the following parts:

Pegasus Server:

### Rationale

## Current Status

Pegasus has been an open source project on GitHub <https://github.com/XiaoMi/pegasus> since October 2017.
At XiaoMi.

### Releases

Pegasus has undergone multiple public releases, listed here: <https://github.com/XiaoMi/pegasus/releases>.

These old releases was not performed in the typical ASF fashion.
We will adopt the ASF source release process upon joining the incubator.

### Code review

Pegasus’s code reviews are currently public on Github <https://github.com/XiaoMi/pegasus/pulls>.

### Meritocracy

Pegasus has been deployed in production at XiaoMi and is applying more than <TODO> lines of business.
It has demonstrated great performance benefits and has proved to be a better way for storing large
scale key value data with low latency.

Still We look forward to growing a rich user and developer community.

### Community

Pegasus seeks to develop developer and user communities during incubation.

### Core Developers

- Zuoyan Qin (<https://github.com/qinzuoyan>)
- Yuchen He (<https://github.com/hycdong>)
- Liuyang Cai (<https://github.com/LoveHeat>)
- Tao Wu (<https://github.com/neverchanje>)
- Yingchun Lai (<https://github.com/acelyc111>)
- Wei Huang (<https://github.com/vagetablechicken>)

### Alignment

Pegasus is aligned with several other ASF projects.

We are working on a new feature to load data stored in the HDFS filesystem.
Pegasus can also upload checkpoints to HDFS, for both backup and analysis purpose.
We are planing to support offline analysis on checkpoint powered by Apache Spark.

## Known Risks

### Orphaned Products

3 of the core developers of Pegasus plan to work full time on this project.
There is very little risk of Pegasus getting orphaned since at least one large
company (XiaoMi) is extensively using it in their production.
For example, currently there are more than XXX Pegasus applications in production.
Furthermore, since Pegasus was open sourced at the beginning of October 2017,
it has received more than 1047 stars and been forked nearly 186 times.
We plan to extend and diversify this community further through Apache.

### Inexperience with Open Source

The core developers are all active users and followers of open source.
They are already committers and contributors to the Pegasus Github project.
All have been involved with the source code that has been released under an
open source license, and several of them also have experience developing
code in an open source environment. Though the core set of Developers do
not have Apache Open Source experience, there are plans to onboard
individuals with Apache open source experience on to the project.

### Homogenous Developers

TODO

### Reliance on Salaried Developers

TODO

### An Excessive Fascination with the Apache Brand

Pegasus is proposing to enter incubation at Apache in order to help efforts
to diversify the committer-base, not so much to capitalize on the Apache brand.
The Pegasus project is in production use already inside XiaoMi,
but is not expected to be an Baidu product for external customers.
As such, the Pegasus project is not seeking to use the Apache brand as
a marketing tool.

## Documentation

Information about Pegasus can be found at <https://github.com/baidu/pegasus>.
The following links provide more information about Pegasus in open source:

- <https://pegasus-kv.github.io>

## External Dependencies

Pegasus has the following external dependencies.

* RocksDB (Apache)
* Apache Thrift (Apache Software License v2.0)
* Boost (Boost Software License)
* Apache Zookeeper (Apache)
* Microsoft rDSN (MIT)
* Google s2geometry (BSD)
* Google gflags (BSD)
* fmtlib ()
* POCO ()
* rapidjson (Tencent)
* libevent ()
* gperftools ()

Build and test dependencies:

* Apache Maven (Apache Software License v2.0)
* cmake (BSD)
* clang (BSD)
* Google gtest (Apache Software License v2.0)

## Required Resources

### Mailing List

There are currently no mailing lists. The usual mailing lists are expected to be set up when entering incubation:

TODO

### Git Repositories

Upon entering incubation, we want to move the existing repo from <https://github.com/XiaoMi/pegasus>
to Apache infrastructure like <https://github.com/apache/incubator-pegasus>.

### Issue Tracking

Pegasus currently uses GitHub to track issues. Would like to continue to do so while we discuss migration possibilities with the ASF Infra committee.

### Other Resources

The existing code already has unit tests so we will make use of existing Apache continuous testing infrastructure. The resulting load should not be very large.

## Source and Intellectual Property Submission Plan

Current code is Apache 2.0 licensed and the copyright is assigned to XiaoMi.
If the project enters incubator, XiaoMi will transfer the source code & trademark
ownership to ASF via a Software Grant Agreement.

## Initial Committers

- Zuoyan Qin (<https://github.com/qinzuoyan>)
- Weijie Sun (<https://github.com/shengofsun>)
- Yuchen He (<https://github.com/hycdong>)
- Tao Wu (<https://github.com/neverchanje>)
- Yingchun Lai (<https://github.com/acelyc111>)
- Wei Huang (<https://github.com/vagetablechicken>)

## Affiliations

<!-- The initial committers are employees of XiaoMi Inc. -->

## Sponsors

### Champion

TODO

### Nominated Mentors

TODO

### Sponsoring Entity

We are requesting the Incubator to sponsor this project.
