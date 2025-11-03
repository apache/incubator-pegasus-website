---
permalink: api/index.html
---

这里介绍 Pegasus 服务所提供的用户接口。客户端可以在我们的服务接口上做二次封装。
通常你只需要通过 [客户端文档](/clients) 学习如何与 Pegasus 交互。

当前 Pegasus 支持几种接口协议：

## Pegasus 协议

这也是我们的客户端与 Pegasus 服务端交互所使用的协议。我们通过该协议暴露了

- 单行幂等原子操作，如 set/get/del/ttl...

- 单行非幂等原子操作，如 check_and_mutate/incr...

- 多行幂等原子操作，如 multiset/multiget/multidel...

- 支持过滤的扫描操作，如 hash_scan/unordered_scan...

## Redis 协议

我们通过 Pegasus Redis Proxy 这一组件在 Pegasus 协议之上支持了 Redis 协议。
你可以阅读 [Redis适配](/redis) 了解更多。

因为 Redis 接口提供了 GEO 支持，我们也借此支持了地理信息查询的功能。
你可以阅读 [GEO支持](/geo) 了解更多。 
