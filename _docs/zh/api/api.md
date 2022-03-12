---
permalink: api/index.html
---

这里介绍Pegasus服务所提供的用户接口。客户端可以在我们的服务接口上做二次封装。
通常你只需要通过 [客户端文档](/_docs/zh/clients) 学习如何与Pegasus交互。

当前Pegasus支持几种接口协议：

## Pegasus 协议

这也是我们的客户端与Pegasus服务端交互所使用的协议。我们通过该协议暴露了

- 单行幂等原子操作，如 set/get/del/ttl...

- 单行非幂等原子操作，如 check_and_mutate/incr...

- 多行幂等原子操作，如 multiset/multiget/multidel...

- 支持过滤的扫描操作，如 hash_scan/unordered_scan...

## Redis 协议

我们通过Pegasus Redis Proxy这一组件在Pegasus协议之上支持了Redis协议。
你可以阅读 [Redis适配](/_docs/zh/api/redis.md) 了解更多。

因为Redis接口提供了GEO支持，我们也借此支持了地理信息查询的功能。
你可以阅读 [GEO支持](/_docs/zh/api/geo.md) 了解更多。 
