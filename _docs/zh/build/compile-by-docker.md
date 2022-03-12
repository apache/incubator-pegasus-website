---
permalink: docs/build/compile-by-docker/
---

## 下载Docker镜像

Pegasus将编译环境封装至[Docker镜像](https://hub.docker.com/r/apachepegasus/build-env)中，你可以直接基于此环境编译代码。

```sh
docker pull apachepegasus/build-env:centos7
```

如果希望基于正式发布的稳定版本（如 {{ site.latest_pegasus_version }}）进行编译，你可以下载：

```sh
docker pull apachepegasus/build-env:{{ site.latest_pegasus_version }}-centos7
```

## 编译

请先参考[下载文档](/_docs/zh/downloads.md)获取源码到某目录（`/your/local/apache-pegasus-source`）下。随后运行以下命令：

```sh
docker run -v /your/local/apache-pegasus-source:/root/pegasus \
           apachepegasus/build-env:{{ site.latest_pegasus_version }}-centos7 \
           /bin/bash -c "./run.sh build -c"
```

编译的结果会被放在项目根目录的`DSN_ROOT/`文件夹下，其中包含bin、include、lib目录。

## 编译打包

打包server端程序包，用于服务部署：

```bash
docker run -v /your/local/apache-pegasus-source:/root/pegasus \
           apachepegasus/build-env:{{ site.latest_pegasus_version }}-centos7 \
           /bin/bash -c "./run.sh pack_server"
```

打包client端库，用于C/C++端客户端开发：

```bash
docker run -v /your/local/apache-pegasus-source:/root/pegasus \
           apachepegasus/build-env:{{ site.latest_pegasus_version }}-centos7 \
           /bin/bash -c "./run.sh pack_client"
```

打包tools工具集，里面包含了各种工具（shell、bench）：

```bash
docker run -v /your/local/apache-pegasus-source:/root/pegasus \
           apachepegasus/build-env:{{ site.latest_pegasus_version }}-centos7 \
           /bin/bash -c "./run.sh pack_tools"
```

编译成功后，推荐先[体验onebox集群](/_overview/zh/onebox.md)。
