---
title: Go客户端文档
layout: page
show_sidebar: false
menubar: clients_menu
---

## 项目地址

<https://github.com/XiaoMi/pegasus-go-client>

## 版本要求

```
>= go 1.8
```

## 安装

```
go get github.com/XiaoMi/pegasus-go-client
```

## 使用

### 示例

完整的示例请参考[example](https://github.com/XiaoMi/pegasus-go-client/tree/master/example)。

### log配置文件

go-client 提供了简单的日志接口 pegalog，用户可以使用现有的日志库来实现该接口，go-client 会经由该接口来打印内部日志。

```go
type Logger interface {
    Fatal(args ...interface{})
    Fatalf(format string, args ...interface{})
    Fatalln(args ...interface{})
    Print(args ...interface{})
    Printf(format string, args ...interface{})
    Println(args ...interface{})
}
```

### 注意事项

go-client 提供了两种客户端实现以应付不同的使用场景，它们使用相同的接口，但实现分别放在不同的两个包下：

- **pegasus**: RPC 采用 pipeline 实现，即不等待服务端（单指某一 server，server 之间的 RPC 互不影响）发回消息响应就发送下一条消息。这种实现的好处在于吞吐大，延时小，缺点在于实现较为复杂。在我们的性能测试（使用 [pingcap/go-ycsb](https://github.com/pingcap/go-ycsb)）中，使用该实现的 go-client 仅用一个实例即可把 5 replica-server 的服务打满（ <https://github.com/XiaoMi/pegasus-go-client/issues/4> ）。我们**推荐使用这一实现**。

- **pegasus2**: RPC 采用非 pipeline 实现，即 RPC 依次进行，只有等待上一条消息成功收到服务端的响应，才可发下一条消息。这种做法的性能较差，但有些业务青睐于它的实现简单。使用 pegasus2 的用户通常需要为一张表维护多个 `TableConnector` 才能够满足性能要求，其中每个 `TableConnector` 对每个 replica server 会维护一个 tcp 连接。我们推荐使用连接池的方式，根据请求数动态调节池中 `TableConnector` 的数量。
