---
permalink: 2.4.0/docs/build/compile-by-docker/
redirect_from:
  - 2.4.0/docs/build/compile-by-docker/
  - docs/installation
version: 2.4.0
---

## 下载Docker镜像

Pegasus将编译环境封装至[Docker镜像](https://hub.docker.com/r/apache/pegasus/tags?page=1&name=env)中，这里包含有多个Linux发行版，你可以直接基于这些环境编译代码。

比如，你可以使用基于`Ubuntu 20.04`的镜像：

```sh
docker pull apache/pegasus:build-env-ubuntu2004-v2.4
```

## 编译

请先参考[下载文档](/docs/downloads)获取源码到某目录（`/your/local/apache-pegasus-source`）下。随后运行以下命令：

```sh
docker run -v /your/local/apache-pegasus-source:/root/pegasus \
           apache/pegasus:build-env-ubuntu2004-v2.4 \
           /bin/bash -c "cd /root/pegasus; ./run.sh build -c --clear_thirdparty -j $(nproc)"
```

编译的结果会被放在项目根目录的`DSN_ROOT/`文件夹下，其中包含bin、include、lib目录。

## 编译打包

打包server端程序包，用于服务部署：

```bash
docker run -v /your/local/apache-pegasus-source:/root/pegasus \
           apache/pegasus:build-env-ubuntu2004-v2.4 \
           /bin/bash -c "./run.sh pack_server"
```

打包client端库，用于C/C++端客户端开发：

```bash
docker run -v /your/local/apache-pegasus-source:/root/pegasus \
           apache/pegasus:build-env-ubuntu2004-v2.4 \
           /bin/bash -c "./run.sh pack_client"
```

打包tools工具集，里面包含了各种工具（shell、bench）：

```bash
docker run -v /your/local/apache-pegasus-source:/root/pegasus \
           apache/pegasus:build-env-ubuntu2004-v2.4 \
           /bin/bash -c "./run.sh pack_tools"
```

编译成功后，推荐先[体验onebox集群](/overview/onebox)。
