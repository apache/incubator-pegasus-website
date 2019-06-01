---
title: 编译构建
layout: page
show_sidebar: false
menubar: overview_menu
---

Pegasus目前只支持Linux平台。目前在CentOS、Ubuntu上都测试运行过。

编译过程中遇到问题，请先参考下面的**常见问题**，如果还不能解决，请加入[微信交流群](https://github.com/XiaoMi/pegasus/wiki/%E5%85%B3%E4%BA%8E%E6%88%91%E4%BB%AC)向我们咨询。

目录：
* [用docker编译](#用docker编译)
* [安装依赖](#%E5%AE%89%E8%A3%85%E4%BE%9D%E8%B5%96)
* [源码编译](#%E6%BA%90%E7%A0%81%E7%BC%96%E8%AF%91)
* [常见问题](#%E5%B8%B8%E8%A7%81%E9%97%AE%E9%A2%98)
  * [更新代码后重新编译](#%E6%9B%B4%E6%96%B0%E4%BB%A3%E7%A0%81%E5%90%8E%E9%87%8D%E6%96%B0%E7%BC%96%E8%AF%91)
  * [使用非系统自带的boost库](#%E4%BD%BF%E7%94%A8%E9%9D%9E%E7%B3%BB%E7%BB%9F%E8%87%AA%E5%B8%A6%E7%9A%84boost%E5%BA%93)
  * [使用toolchain编译](#%E4%BD%BF%E7%94%A8toolchain%E7%BC%96%E8%AF%91)
  * [运行时出现libstdc++版本不兼容问题](https://github.com/xiaomi/pegasus/wiki/%E7%BC%96%E8%AF%91%E6%9E%84%E5%BB%BA#%E8%BF%90%E8%A1%8C%E6%97%B6%E5%87%BA%E7%8E%B0libstdc%E7%89%88%E6%9C%AC%E4%B8%8D%E5%85%BC%E5%AE%B9%E9%97%AE%E9%A2%98)
  * [指定gflags以编译bench工具](#%E6%8C%87%E5%AE%9Agflags%E4%BB%A5%E7%BC%96%E8%AF%91bench%E5%B7%A5%E5%85%B7)
***

# 用docker编译

如果你的机器支持运行docker,推荐使用我们提供的dockerfile进行编译:
* centos: [请点击此处](https://github.com/XiaoMi/pegasus/blob/master/docker/dev/centos7/Dockerfile)
* Ubuntu: TBD

# 安装依赖

Pegasus编译依赖以下软件：
* 编译器：GCC 4.8及以上版本，要求支持C++11
* CMake：2.8.12及以上版本
* Boost：1.58及以上版本
* openssl: 1.10以下版本（pegasus 1.10及以下版本有该限制，以上版本无限制）
* 其他库：libaio、snappy、zstd、lz4、gflags、zlib

如果是Ubuntu，可以使用apt-get安装依赖库：
```bash
sudo apt-get install build-essential cmake libboost-all-dev libaio-dev libsnappy-dev libzstd-dev liblz4-dev libgflags-dev zlib1g zlib1g.dev patch git curl zip automake libtool libssl-dev
```

如果是CentOS，可以使用yum安装依赖库（不含gflags）：
```bash
yum -y groupinstall "Development Tools"
yum -y install cmake boost-devel libaio-devel snappy-devel zstd-devel lz4-devel gflags-devel zlib zlib-devel patch openssl-devel
```

如果你的系统没有提供zstd的软件源，你可以尝试手动安装，这里提供一个安装脚本：
```bash
wget https://github.com/facebook/zstd/archive/v1.3.7.zip
unzip v1.3.7
cd zstd-1.3.7
mkdir cmake-build
cd cmake-build
cmake -DCMAKE_INSTALL_PREFIX=/usr -DCMAKE_INSTALL_LIBDIR=lib -DZSTD_BUILD_PROGRAMS=OFF ../build/cmake
sudo make install -j8
```

# 源码编译

从github获取Pegasus源代码，并递归获取其依赖的[rDSN](https://github.com/xiaomi/rdsn)：
```bash
git clone https://github.com/xiaomi/pegasus.git --recursive
cd pegasus
```

如果要编译发布的稳定版本，请checkout至相应的tag（建议用[最新的release版本](https://github.com/xiaomi/pegasus/releases)），譬如：
```bash
git checkout -b v1.11.2 v1.11.2
git submodule update
```

运行build命令进行编译，该命令使用CMake来进行构建：
```bash
./run.sh build
```

build命令支持以下参数：
* --compiler：指定C和C++编译器，通过逗号分隔的，默认为"gcc,g++"。
* -t|--type：指定编译类型是debug还是release，默认为release。
* -j|--jobs：指定编译的并发度，默认为8。
* -b|--boost_dir：指定boost安装路径，如果不指定则使用系统自带的boost。
* -w|--warning_all：打开所有编译警告，默认不打开。
* -v|--verbose：输出详细的编译信息，默认不输出。
* -c|--clear：在编译前先清理环境（不清理thirdparty），默认不清理。
* -cc|--harf-clear：在编译前先清理环境（不清理rdsn和thirdparty），默认不清理。
* --thirdparty：在编译前清理所有环境（包括thirdparty），默认不清理。

编译后输出会放在当前目录的DSN_ROOT/文件夹下，里面包含bin、include、lib目录。

可以用pack_server命令打包server端程序包，用于部署cluser：
```bash
./run.sh pack_server
```

可以用pack_client命令打包client端库，用于C/C++端客户端开发：
```bash
./run.sh pack_client
```

可以用pack_tools命令打包tools包，里面包含了各种工具（shell、bench）：
```bash
./run.sh pack_tools
```

编译成功后，推荐先[体验onebox集群](%E4%BD%93%E9%AA%8Conebox%E9%9B%86%E7%BE%A4)。

# 常见问题

## 更新代码后重新编译

如果通过```git pull```更新代码后，可能会出现编译失败的情况，这可能是因为：
* 依赖的子模块发生了变化，需要更新子模块到合适的版本（通过```git status```可以看rdsn和rocksdb子模块是否发生变化）；
* 编译配置发生了变化，CMake文件已过期；
* thirdparty依赖发生了变化，需要重新下载和编译依赖库；

可以先尝试按照如下步骤是否能解决（解决子模块和编译配置发生变化的问题）：
```bash
git submodule update
./run.sh build -c
```

如果还不能解决，可以进一步尝试（解决thirdparty依赖变化的问题）：
```bash
./run.sh build --clear_thirdparty
```

如果还不能解决，请咨询我们。

## 使用非系统自带的boost库

编译默认使用系统自带的boost库，但是如果系统自带的库版本太低且无法升级，可以自己下载和编译高版本的boost库，然后通过```-b```参数传进来：
```bash
./run.sh build -b /your/boost/installation/path
```

譬如：
```bash
./run.sh build -b /home/work/software/boost_1_58_0/output
```

## 使用toolchain编译

编译默认使用系统自带的gcc/g++，但是如果系统自带的编译器版本太低且无法升级（不支持C++11），可以自己下载和编译高版本的gcc toolchain，然后放到PATH中：
```bash
export PATH="$TOOLCHAIN_DIR/bin:$PATH"
./run.sh build
```

## 运行时出现libstdc++版本不兼容问题

如果用户使用自己的（非系统自带的）gcc或者boost库，在运行时可能出现c++版本不兼容的错误：
```
./pegasus_server: /usr/lib64/libstdc++.so.6: version `GLIBCXX_3.4.14' not found (required by ./pegasus_server)
./pegasus_server: /usr/lib64/libstdc++.so.6: version `GLIBCXX_3.4.17' not found (required by ./pegasus_server)
./pegasus_server: /usr/lib64/libstdc++.so.6: version `GLIBCXX_3.4.19' not found (required by ./pegasus_server)
./pegasus_server: /usr/lib64/libstdc++.so.6: version `CXXABI_1.3.5' not found (required by ./pegasus_server)
```

此时最好使用pack工具打包成运行时的执行包：
 * pack_server：服务包，用于部署Pegasus集群的服务进程。注意在运行前需要：`export LD_LIBRARY_PATH=$package_dir/DSN_ROOT/lib`。
 * pack_client：C++客户端库，用于业务开发。
 * pack_tools：工具包，run.sh里面大部分命令都能用，包括shell和onebox工具。

以上三个pack工具都支持`-b`和`-g`选项，将用户自己的boost和gcc库放到DSN_ROOT/lib中，避免运行时链接到错误的库。这样，即使跨机器，只要libc兼容，执行包都能正常使用，避免库不兼容的困扰。

如果你用了自己的gcc，就在pack的时候加上`-g`选项，譬如：
```
./run.sh pack_server -g
```

如果你用了自己的boost，就在pack的时候加上`-b`选项，譬如：
```
./run.sh pack_server -b
```

如果都用了，就同时加上`-b`和`-g`选项，譬如：
```
./run.sh pack_server -b -g
```

## 指定gflags以编译bench工具

注：从1.10.0版本开始，Pegasus编译强制依赖gflags库，以下步骤可以忽略。

Pegasus的bench工具修改自RocksDB的bench，其在编译时需要依赖gflags，如果找不到gflags，虽然也能编译成功，但是bench程序无法使用，会报如下错误：
```
Please install gflags to run rocksdb tools
```

默认使用系统库中自带的gflags，如果系统库中没有安装，可以自己下载和编译gflags库，然后放到以下环境变量中：
```bash
export CPATH="$GFLAGS_DIR/include"
export LIBRARY_PATH="$GFLAGS_DIR/lib"
./run.sh build
```

