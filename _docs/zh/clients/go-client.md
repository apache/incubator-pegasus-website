---
permalink: clients/go-client
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
