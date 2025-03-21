---
permalink: administration/whitelist
---

# 介绍

Pegasus 的 Replica Server 白名单功能用来防止非预期的 Replica Server 加入到集群。例如：
1. 已下线的 Replica Server 非预期重启后，重新加入集群
2. Replica Server 配置的 Meta Server 地址有误，导致它加入到了别的集群

Replica Server 白名单功能未开启时，任何 Replica Server 只需要配置对应集群的 Meta Server 地址，就可以加入该集群。

Replica Server 白名单功能开启时，Meta Server 只允许 Replica Server 白名单中的 Replica Server 加入集群。

# Replica Server 白名单使用方式

## 配置

配置 `[meta_server].enable_white_list` 与 `[meta_server].replica_white_list`，多个服务器使用 `,` 分隔：
```
[meta_server]
  enable_white_list = true
  replica_white_list = 127.0.0.1:34801,127.0.0.2:34801
```

## 查询

Replica Server 白名单配置修改后需要重启 Meta Server 生效。可以通过 shell 工具的 [Remote commands](remote-commands) 或 [HTTP API](/api/http) 来查询。

以 remote_command 为例：
```
>>> remote_command -t meta-server fd.allow_list
```

# 扩缩容

在 Replica Server 白名单开启后，扩缩容操作需要考虑该功能的影响。

## 扩容

由于扩容的 Replica Server 需要与 Meta Server 通信，如果此时 Replica Server 白名单尚未更新，会导致 Meta Server 拒绝这个新 Replica Server 加入集群。

所以，对于开启了 Replica Server 白名单功能的集群的扩容步骤，需要在 [扩容流程](/administration/scale-in-out#扩容流程) 前，进行以下步骤：
1. 修改 Meta Server 的 Replica Server 白名单配置，加入需要扩容的 Replica Server
2. 重启 Meta Server 使其生效

## 缩容

在 [缩容流程](/administration/scale-in-out#缩容流程) 中，Replica Server 白名单不会造成任何影响。Replica Server 白名单的更新可以在缩容完成之后任意时刻进行。

但为了安全，建议及时更新 Replica Server 白名单。只需在缩容流程的最后一步（即：_重启 Meta Server_）前，修改 Meta Server 的 Replica Server 白名单配置。
