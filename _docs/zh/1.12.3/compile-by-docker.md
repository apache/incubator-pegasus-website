---
permalink: 1.12.3/docs/build/compile-by-docker/
version: 1.12.3
---

## 下载Docker镜像

```sh
docker pull apachepegasus/build-env:{{ page.version }}-centos7
```

```sh
docker pull apachepegasus/build-env:{{ page.version }}-ubuntu1604
```

## 编译

请先参考[下载文档](/docs/downloads)获取源码到某目录（`/your/local/apache-pegasus-source`）下。随后运行以下命令：

```sh
docker run -v /your/local/apache-pegasus-source:/root/pegasus \
           apachepegasus/build-env:{{ page.version }}-centos7 \
           /bin/bash -c "./run.sh build -c"
```

编译的结果会被放在项目根目录的`DSN_ROOT/`文件夹下，其中包含bin、include、lib目录。

## 编译打包

打包server端程序包，用于服务部署：

```bash
docker run -v /your/local/apache-pegasus-source:/root/pegasus \
           apachepegasus/build-env:{{ page.version }}-centos7 \
           /bin/bash -c "./run.sh pack_server"
```

打包client端库，用于C/C++端客户端开发：

```bash
docker run -v /your/local/apache-pegasus-source:/root/pegasus \
           apachepegasus/build-env:{{ page.version }}-centos7 \
           /bin/bash -c "./run.sh pack_client"
```

打包tools工具集，里面包含了各种工具（shell、bench）：

```bash
docker run -v /your/local/apache-pegasus-source:/root/pegasus \
           apachepegasus/build-env:{{ page.version }}-centos7 \
           /bin/bash -c "./run.sh pack_tools"
```

编译成功后，推荐先[体验onebox集群](/overview/onebox)。
