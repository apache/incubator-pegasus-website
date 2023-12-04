---
permalink: docs/build/compile-from-source/
redirect_from:
  - master/docs/build/compile-from-source/
  - docs/installation
version: master
---

从2.4.0开始，Pegasus支持Linux和macOS平台进行源码编译。编译过程中遇到问题，可以通过[Github Issues]({{ site.pegasus_github_url }}/issues)向我们咨询。

## 环境要求

- GCC 5.4.0+
- CMake 3.11.0+

## Linux环境配置

你可以参考的Docker镜像来安装依赖并设置环境变量。例如：

- [CentOS 7](https://github.com/apache/incubator-pegasus/blob/master/docker/pegasus-build-env/centos7/Dockerfile)
- [Ubuntu 18.04](https://github.com/apache/incubator-pegasus/blob/master/docker/pegasus-build-env/ubuntu1804/Dockerfile)
- [Ubuntu 20.04](https://github.com/apache/incubator-pegasus/blob/master/docker/pegasus-build-env/ubuntu2004/Dockerfile)
- [Ubuntu 22.04](https://github.com/apache/incubator-pegasus/blob/master/docker/pegasus-build-env/ubuntu2204/Dockerfile)

## 源码编译

请先参考[下载文档](/docs/downloads)获取源码。

如果你想要执行测试程序，需要用如下命令来编译Pegasus：
```bash
./run.sh build --test -c --clear_thirdparty -j $(nproc)
```

如果不需要执行测试程序，只是单纯想编译Pegasus，使用如下命令即可：
```bash
./run.sh build -c --clear_thirdparty -j $(nproc)
```

编译后输出会放在当前目录的`build/latest/output/`目录下，里面包含`bin`、`include`以及`lib`目录。

## 执行测试程序

```bash
./run.sh test
```

## 编译打包

打包server端程序包，用于服务部署：

```bash
./run.sh pack_server
```

打包client端库，用于C/C++端客户端开发：

```bash
./run.sh pack_client
```

打包tools工具集，里面包含了各种工具（shell、bench）：

```bash
./run.sh pack_tools
```

编译成功后，推荐先[体验onebox集群](/overview/onebox)。
