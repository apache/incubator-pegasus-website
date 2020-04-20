---
title: 可视化监控
layout: page
menubar: administration_menu
---

## 组件

从[v1.12.0](https://github.com/XiaoMi/pegasus/releases)开始, Pegasus 支持使用 [Prometheus](https://prometheus.io/) 和 [Grafana](https://grafana.com/) 进项监控项的采集和展示。

- Prometheus

> Prometheus 是一款开源的系统监控和报警套件。它可以通过将采集被监控系统的监控项存入自身的时序数据库中，并且通过丰富的多维数据查询语言，满足用户的不同数据展示需求。

- Grafana

> Grafana 是一款开源的数据分析和展示平台。支持包括 Prometheus 在内的多个主流时序数据库源。通过对应的数据库查询语句，从数据源中获取展现数据。通过灵活可配置的 Dashboard，快速的将这些数据以图表的形式展示给用户。

***注意***

本文档仅提供一种使用 Prometheus 和 Grafana 进行 Pegasus 监控数据采集和展示的方式。Pegasus**不包含、不维护这些组件**。更多关于这些组件的详细介绍，请移步对应官方文档进行查阅。

## 开始搭建

请在完成 Pegasus 的部署后，开始搭建监控系统。

### Prometheus安装与使用

获取Prometheus

```sh
wget https://github.com/prometheus/prometheus/releases/download/v2.15.2/prometheus-2.15.2.linux-amd64.tar.gz
tar xvfz prometheus-2.15.2.linux-amd64.tar.gz
cd prometheus-2.15.2.linux-amd64
```

修改prometheus目录下的prometheus.yml文件，如下所示：

```yaml
global:
  scrape_interval: 5s

scrape_configs:
  - job_name: 'pegasus'
    static_configs:
      - targets: ['collector_host:9091']
        labels:
          group: collector

      - targets: ['meta_host1:9091', 'meta_host2:9091', 'meta_host3:9091']
        labels:
          group: meta

      - targets: ['replica_host1:9091', 'replica_host2:9091', 'replica_host3:9091']
        labels:
          group: replica
      #
      # NOTE: Add the following lines if node exporter is deployed.
      # - targets:
      #     [
      #       'node_exporter_host1:9100',
      #       'node_exporter_host2:9100',
      #       ...
      #       'node_exporter_hostn:9100',
      #     ]
      #   labels:
      #     group: node_exporter
```

修改完prometheus.yml之后，启动prometheus:

```sh
./prometheus --config.file=prometheus.yml
```

进入网址 [localhost:9090](http://localhost:9090) 看到如下界面即表示到这一步为止是成功的。

![prometheus-server](/assets/images/prometheus-server.png)

在Expression框内输入需要查找的内容，点击Excute即可在Element中展示查找到的内容，当选择Graph时可以显示该内容一段时间内数值变化情况。

***注意***

1.实际运维过程中, 我们通常需要获取一些机器及操作系统的监控指标, 如cpu.busy, disk.iostat等等, 所以在部署Pegasus集群的时候，可以考虑在每一台机器上部署一个node exporter后台实例，具体可参考: [Node Exporter](https://github.com/prometheus/node_exporter)

2.[Alert Manager](https://github.com/prometheus/alertmanager) 为 Prometheus 报警组件，需单独部署（暂不提供方案，可参照官方文档自行搭建）。通过 Alert Manager，用户可以配置报警策略，接收邮件、短信等报警。

3.目前我们的prometheus.yml使用的是静态配置的方式（static_configs），其缺点是当动态扩容缩容的时候需要手动去修改该静态配置。当前Prometheus支持多种动态服务发现方式，例如k8s、consul和dns等等，用户也可以根据自己需求去定制实现。详情请参考文档：[配置文件说明](https://prometheus.io/docs/prometheus/latest/configuration/configuration/)、[实现动态服务发现](https://prometheus.io/blog/2018/07/05/implementing-custom-sd/)

### Grafana安装与使用

获取Grafana

```sh
wget https://dl.grafana.com/oss/release/grafana-6.0.0.linux-amd64.tar.gz //如果报错，可以尝试在后面添加--no-check-certificate
tar -zxvf grafana-6.0.0.linux-amd64.tar.gz
cd grafana-6.0.0
```

启动Grafana

```sh
./bin/grafana-server web
```

观察到如下输出，即为启动成功

```Linux
INFO[07-24|14:36:59] Starting Grafana                         logger=server version=6.0.0 commit=34a9a62 branch=HEAD compiled=2019-02-25T22:47:26+0800
...
INFO[07-24|14:37:00] HTTP Server Listen                       logger=http.server address=0.0.0.0:3000 protocol=http subUrl= socket=
INFO[07-24|14:37:00] cleanup of expired auth tokens done      logger=auth count=2
```

启动之后打开 [localhost:3000](localhost:3000) 即可进入Grafana界面如下图所示（初始用户名和密码为admin:admin）

![grafana-login](/assets/images/grafana-login.png)

### Pegasus DashBoard配置

目前Pegasus拥有一个DashBoard，用于提供一些基本的监控信息。其相应的json文件: [Pegasus json文件](https://github.com/pegasus-kv/pegasus-kv.github.io/tree/master/assets/json/grafana-dashboard.json)

下载了json文件后，可以通过import的方式将其导入进去。其步骤如下：

进入grafana，点击左边框的"+"，选择import，进入import页面

![grafana-import-panel](/assets/images/grafana-import-panel-upload.png)

点击右上角的"Upload .json File"，然后选择文件。选择之后进入如下页面

![grafana-import-panel](/assets/images/grafana-import-panel.png)

然后点击左下角的"import"按钮完成导入，并进入到Pegasus相应的DashBoard，其页面如下所示

![grafana-import-panel](/assets/images/grafana-dashboard-pegasus.png)

从图中可以看出，Pegasus的DashBoard分为两个row: Pegasus-Cluster和Pegasus-Table，分别代表集群级别监控和表级监控。在左上角的cluster_name后输入具体的集群名字，便可以查看该集群相应的各种监控信息。

## Onebox使用Prometheus

如果使用onebox进行测试，请修改src/server/config.min.ini配置如下:

```ini
[pegasus.server]
  perf_counter_sink = prometheus
```

由于onebox模式下多个Pegasus服务进程部署在一台机器上，因此各replica、meta、collector的prometheus端口存在冲突问题.

我们的解决办法是对每个服务节点配置单独的prometheus port:

- collector : 9091
- meta: [9092, 9093, 9094...]
- replica: [9092+{META_COUNT}, 9093+{META_COUNT}, 9094+{META_COUNT}...]

例如一个2 meta, 3 replica, 1 collector的onebox集群, 其prometheus.yml应如下配置:

```sh
./run.sh start_onebox -r 3 -m 2 -c
```

```yml
global:
  scrape_interval: 5s

scrape_configs:
  - job_name: "pegasus"
    static_configs:
      - targets: ["collector_host:9091"]
        labels:
          group: collector

      - targets: ["meta_host1:9092", "meta_host2:9093"]
        labels:
          group: meta

      - targets: ["replica_host1:9094", "replica_host2:9095", "replica_host3:9096"]
        labels:
          group: replica
```
