---
permalink: /overview/architecture
---

## Overall architecture

The overall architecture of the Pegasus is shown in the following figure, which is divided into four parts:
* Client Lib: Encapsulates the mapping rules of user data to the storage server (Replica Server), as well as the communication details with the storage server, and provides a concise Key-Value access interfaces for users to use
* Replica Server: Responsible for data storage and responding to data access requests from Client Lib
* Meta Server: Responsible for the Replica Server survival detection, data sharding management, load balancing, etc. Usually, a deployment mode of one-leader and multiple-backups is adopted
* Zookeeper: Responsible for selecting the leader between the Meta Servers to achieve high availability, and store various metadata of the cluster

![pegasus-architecture-components](/assets/images/pegasus-architecture-components.png){:class="img-responsive"}

## Replica Server

Replica Server is mainly responsible for data storage and access. Provide services using replica as the management unit:
* The serving replica can be in the role of either primary replica or secondary replica
* Using RocksDB as the storage engine at the underlying level
* Manage commit logs and implement data replication protocols to ensure data consistency

## Meta Server

The Meta Servers usually adopted in the deployment mode of one-leader and multiple-backups, and all states are persisted to the Zookeeper and the leader is selected through the Zookeeper. When the leader fails, another backup immediately grabs the lock and restores its state from the Zookeeper, becoming the new leader. The functions that Meta Servers are responsible for include:
* Cluster initialization
* Management of Replica Servers
* Assignment, management, and load balancing scheduling of replicas
* Creating and deleting tables
* Respond to client requests and provide the latest routing table (partition configuration) to the client

## Apache Zookeeper

In Pegasus, Zookeeper has two main functions:
* Cluster metadata storage
* Meta Server leader selection

## Client Lib

Client Lib provides users with data access interfaces, including features:
* Concise interfaces: Provides simple interfaces for users, encapsulating details such as data locating and fault tolerance internally
* Simple configuration: Users only need to specify the Meta Server addresses list through the configuration file to access the Pegasus cluster
* Try to interact directly with Replica Servers and minimize access frequency to Meta Servers to avoid single-point issues, and don't rely on Zookeeper
