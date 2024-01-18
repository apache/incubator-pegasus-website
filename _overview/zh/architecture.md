---
permalink: /overview/architecture
---

## 整体架构

Pegasus系统的整体架构如下图所示，一共分为四个部分：

* Client Lib：封装数据到存储服务器的映射规则，以及和存储服务器（Replica Server）的通信细节，而提供一套简洁的Key-Value存取接口供用户使用
* Replica Server：负责数据存储，响应Client Lib的数据存取请求
* Meta Server：负责Replica Server的存活检测、数据分片(replica)管理、负载均衡等，通常采用一主多备的部署模式
* Zookeeper：负责对Meta Server进行选主，以实现leader节点的高可用，并存储系统的各种元数据

![pegasus-architecture-components](/assets/images/pegasus-architecture-components.png){:class="img-responsive"}

## Replica Server

Replica Server主要负责数据存储和存取，以replica为管理单元提供服务：

* 服务的replica角色既可能是主（primary）副本，也可能是从（secondary）副本
* 底层使用RocksDB来存储数据
* 管理commit log，并实现数据复制协议，提供数据一致性保证

## Meta Server

Meta Server通常采用一主多备的部署模式，所有的状态都会持久化到Zookeeper上，同时通过Zookeeper进行选主。当leader故障后，另一台backup立即抢到锁，然后从Zookeeper上恢复状态，成为新的leader。Meta Server负责的功能包括：

* 集群初始化
* Replica Server的管理
* Replica的分配、管理和负载均衡调度
* Table的创建与删除
* 响应Client请求，对Client提供最新的路由表（partition configuration）

## Apache Zookeeper

在Pegasus中，Zookeeper主要有两个功能：

* 集群元信息存储
* Meta Server选主

## Client Lib

Client Lib对用户提供数据存取接口，其特点包括：

* 接口简洁：对用户提供简单的接口，将数据寻址和容错等细节封装在内部
* 配置简单：用户只需通过配置文件指定Meta Server地址列表，就可以访问Pegasus集群
* 尽量直接与Replica Server进行交互，尽量少地访问Meta Server的频率以避免单点问题，不依赖Zookeeper
