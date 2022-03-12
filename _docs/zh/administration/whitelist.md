---
permalink: administration/whitelist
---

## 介绍

Pegasus的白名单功能用来防止非预期的replica server加入集群。例如：
1. 已stop的replica server因外因重启后，加入集群；
2. replica server配置的meta server地址有误，加入别的集群。

白名单功能禁用时，任何replica server只需要配置meta server地址，就可以被加入该集群。

白名单功能开启时，meta server只允许白名单中的replica server(ip:port)加入集群。

## 怎样开启白名单

### 配置

配置 [meta_server].enable_white_list 与 [meta_server].replica_white_list，多个ip用','分隔：
```
[meta_server]
  enable_white_list = true
  replica_white_list = 127.0.0.1:34801,127.0.0.2:34801
```

### 查询

白名单在meta server运行过程中不允许更改，只能通过修改配置并重启来修改。但是可以通过shell的remote_command来查询。

示例：
```
>>> remote_command -t meta-server meta.fd.allow_list
```

## 开启白名单的扩缩容

在白名单开启后，扩缩容操作需要考虑白名单的影响。

### 扩容

由于扩容需replica server先与meta server通信，如果此时白名单未更新，会导致meta server拒绝这个新replica server加入集群。

所以，开启白名单的集群扩容步骤，需要在普通[扩容流程](/_docs/zh/administration/scale-in-out.md#扩容流程)前，进行一下步骤：
1. 修改meta server白名单配置，加入新replica servers
2. 重启meta server

### 缩容

[缩容流程](/_docs/zh/administration/scale-in-out.md#缩容流程)中，白名单不会造成任何影响。白名单的更新也可以在缩容完成之后任意时刻进行。

但为了安全，建议及时更新白名单。只需在缩容流程的最后一步“重启meta server”前，修改meta server的白名单配置。