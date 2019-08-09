---
title: 可视化监控
layout: page
menubar: administration_menu
---

目前Pegasus的集群监控提供了这些途径：

* 使用[Shell工具](/overview/shell)查看集群的各种状态。
* 使用[Falcon](http://www.open-falcon.com/)的监控页面查看各种统计数据的曲线。
* 使用Prometheus+Grafana的监控页面查看各种统计数据的曲线。

## Prometheus安装与使用
详情见[https://prometheus.io/docs/prometheus/latest/getting_started/](https://prometheus.io/docs/prometheus/latest/getting_started/)进行安装，即 Prometheus server

**注意**

因为后续要安装pushgateway,在prometheus.yml中添加
```
- job_name: 'pushgateway'

    scrape_interval: 5s

    static_configs:
      - targets: ['localhost:9091']
        labels:
          instance: 'pushgateway'
```


按照上述网址步骤，在控制台输入以下命令之后
```
./prometheus --config.file=prometheus.yml
```
进入网址[localhost:9090](http://localhost:9090)看到如下界面即表示到这一步为止是成功的
![prometheus-server](/assets/images/prometheus-server.png)

在Expression框内输入需要查找的内容，点击Excute即可在Element中展示查找到的内容，当选择Graph时可以显示该内容一段时间内数值变化情况。

## Prometheus-cpp Client 安装与使用
详情见[https://prometheus.io/docs/instrumenting/clientlibs/](https://prometheus.io/docs/instrumenting/clientlibs/)
该网址内部含有prometheus提供的各种语言的客户端代码，按照个人选择使用，这里选择使用C++
点击进入[https://github.com/jupp0r/prometheus-cpp](https://github.com/jupp0r/prometheus-cpp)，按照指定步骤构建即可使用

**注意**

如果选择通过CMAKE的方式进行构建，请使用git clone的方式获取代码（如下）

```
git clone https://github.com/jupp0r/prometheus-cpp
```
在执行到下述步骤之后

```
make -j 4
```
原则上已经实现了构建的过程，此后在文件夹prometheus-cpp/_build/pull/tests/integration中可以看到sample_server以及在prometheus-cpp/_build/push/tests/integration中可以看到sample_client

 **Prometheus有两种收集数据的方式:**

 1. Prometheus server 定期从配置好的 jobs 或者 exporters 中拉 metrics
 2. Prometheus接收来自 Pushgateway 发过来的 metrics
 
sample_server提供第一种方式将数据传输到配置好的jobs中，在使用这种方式时需要保证sample_server源码中（如下）的端口号出现在prometheus server的配置文件之中（prometheus.yml）
```C++
  // create an http server running on port 8080
  Exposer exposer{"127.0.0.1:8080", "/metrics", 1};
```
sample_client则通过将数据传输到pushgateway来实现数据的收集，所以在使用该方式时需要配置pushgateway，如下所示

## Pushgateway安装与使用
在 pushgateway下载页面[https://github.com/prometheus/pushgateway/releases](https://github.com/prometheus/pushgateway/releases)可以选择需要下载的版本，以v0.4.0为例：
选择你喜欢的文件夹：

```
wget https://github.com/prometheus/pushgateway/releases/download/v0.4.0/pushgateway-0.4.0.linux-amd64.tar.gz
tar -xvzf pushgateway-0.4.0.linux-amd64.tar.gz
cd pushgateway-0.4.0.linux-amd64
```
使用如下命令启动pushgateway

```
./pushgateway
```
当观察到类似如下输出，即表示启动成功

```Linux
INFO[0000] Starting pushgateway (version=0.4.0, branch=master, revision=6ceb4a19fa85ac2d6c2d386c144566fb1ede1f6c)  source=main.go:57
INFO[0000] Build context (go=go1.8.3, user=root@87741d1b66a9, date=20170609-12:25:40)  source=main.go:58
INFO[0000] Listening on :9091.                           source=main.go:102
```
启动成功后进入[localhost:9091/metrics](http://localhost:9091/metrics)可以看到pushgateway接收到的数据
**注意**
pushgateway默认端口号为9091，prometheus-cpp Client中sample_client对应源码（如下）需要保证端口号一致

```C++
Gateway gateway{"127.0.0.1", "9091", "sample_client", labels};
```
## Grafana安装与使用
```.
wget https://dl.grafana.com/oss/release/grafana-6.0.0.linux-amd64.tar.gz //如果报错，可以尝试在后面添加--no-check-certificate
tar -zxvf grafana-6.0.0.linux-amd64.tar.gz
cd grafana-6.0.0
./bin/grafana-server web  //启动Grafana
```
观察到如下输出，即为启动成功

```Linux
INFO[07-24|14:36:59] Starting Grafana                         logger=server version=6.0.0 commit=34a9a62 branch=HEAD compiled=2019-02-25T22:47:26+0800
INFO[07-24|14:36:59] Config loaded from                       logger=settings file=/home/mi/Documents/myPorject/grafana-6.0.0/conf/defaults.ini
INFO[07-24|14:36:59] Path Home                                logger=settings path=/home/mi/Documents/myPorject/grafana-6.0.0
INFO[07-24|14:36:59] Path Data                                logger=settings path=/home/mi/Documents/myPorject/grafana-6.0.0/data
INFO[07-24|14:36:59] Path Logs                                logger=settings path=/home/mi/Documents/myPorject/grafana-6.0.0/data/log
INFO[07-24|14:36:59] Path Plugins                             logger=settings path=/home/mi/Documents/myPorject/grafana-6.0.0/data/plugins
INFO[07-24|14:36:59] Path Provisioning                        logger=settings path=/home/mi/Documents/myPorject/grafana-6.0.0/conf/provisioning
INFO[07-24|14:36:59] App mode production                      logger=settings
INFO[07-24|14:36:59] Initializing HTTPServer                  logger=server
INFO[07-24|14:37:00] Initializing SqlStore                    logger=server
INFO[07-24|14:37:00] Connecting to DB                         logger=sqlstore dbtype=sqlite3
INFO[07-24|14:37:00] Starting DB migration                    logger=migrator
INFO[07-24|14:37:00] Initializing InternalMetricsService      logger=server
INFO[07-24|14:37:00] Initializing SearchService               logger=server
INFO[07-24|14:37:00] Initializing PluginManager               logger=server
INFO[07-24|14:37:00] Starting plugin search                   logger=plugins
INFO[07-24|14:37:00] Initializing RenderingService            logger=server
INFO[07-24|14:37:00] Initializing AlertingService             logger=server
INFO[07-24|14:37:00] Initializing DatasourceCacheService      logger=server
INFO[07-24|14:37:00] Initializing HooksService                logger=server
INFO[07-24|14:37:00] Initializing LoginService                logger=server
INFO[07-24|14:37:00] Initializing QuotaService                logger=server
INFO[07-24|14:37:00] Initializing ServerLockService           logger=server
INFO[07-24|14:37:00] Initializing UserAuthTokenService        logger=server
INFO[07-24|14:37:00] Initializing CleanUpService              logger=server
INFO[07-24|14:37:00] Initializing NotificationService         logger=server
INFO[07-24|14:37:00] Initializing ProvisioningService         logger=server
INFO[07-24|14:37:00] Initializing TracingService              logger=server
INFO[07-24|14:37:00] Initializing Stream Manager 
INFO[07-24|14:37:00] HTTP Server Listen                       logger=http.server address=0.0.0.0:3000 protocol=http subUrl= socket=
INFO[07-24|14:37:00] cleanup of expired auth tokens done      logger=auth count=2
```

启动之后打开[localhost:3000](http://localhost:3000)即可进入Grafana界面如下图所示（初始用户名/密码为admin/admin）

![grafana-login](/assets/images/grafana-login.png)

登录进去之后在页面左边选择设置选择Data Sources

![grafana-dataSource](/assets/images/grafana-dataSource.png)

点击add data source,选择Prometheus

![grafana-addDataSource](/assets/images/grafana-addDataSource.png)

进行如下配置，然后保存

![grafana-addPrometheus](/assets/images/grafana-addPrometheus.png)

点击左边+号选择Dashboard创建新的图像，选择Add Query增加新的查询

![grafana-addDashboard](/assets/images/grafana-addDashboard.png)

在Queries to 里面选择Prometheus，然后在下方的栏目中输出你想要监控的数据即可查看情况

![grafana-searchData](/assets/images/grafana-searchData.png)

具体结果如下图所示

![grafana-addData](/assets/images/grafana-addData.png)
##  监控平台运行顺序即运行方式（供参考）

 1. 打开客户端（prometheus-cpp Client / Pegasus）

```
//prometheus-cpp Client
./sample_client
//Pegasus
./run.sh start_onebox
```

 2. 打开pushgateway

```
./pushgateway
```

 3. 打开Prometheus server

```
./prometheus --config.file=prometheus.yml
```

 4. 打开Grafana

```
./bin/grafana-server web
```

## Grafana中批量创建Panel方式
上述提到手动创建图表的过程，但是在实际使用中，可能会需要一个Dashboard里面就需要多个panel表现许多数据的变化趋势。如果每一次都需要手动创建Dashboard和panel将会是一件十分复杂的事情。下面提供一种通过http API 实现批量创建图表的方式。
### postman安装以提供HTTP发送方式
 #### 安装postman

 1. 官方下载地址[https://www.getpostman.com/](https://www.getpostman.com/)，根据自己的机器类型选择对应下载文件（一般应该是linux 64-bit版本）
 2. 解压
```
tar -xzf postman.tar.gz
```
 3. 运行

```
./Postman
```
进入如下界面

![postman](/assets/images/postman.png)
####   进入Grafana获取API key
选择设置API Keys，然后add API key,填写name，Role选择admin

![grafana-APIKey](/assets/images/grafana-APIKey.png)

![grafana-addAPIKey](/assets/images/grafana-addAPIKey.png)

会得到如下内容（马赛克里面的），只出现一次，请记得保存。

![grafana-getAPIKey](/assets/images/grafana-getAPIKey.png)
#### 使用 Postman发送请求
![postman-sendRequest](/assets/images/postman-sendRequest.png)

选择POST，输入网址

```
http://your_host:3000/api/dashboard/dx
```
在Headers处输入

```
Content-Type        application/json
Authorization       Bearer your_apiKey
Accept              application/json
```
在Body处输入如下内容
```JSON
{
    "dashboard":
    {
        "annotations": {
          "list": [
            {
              "builtIn": 1,
              "datasource": "-- Grafana --",
              "enable": true,
              "hide": true,
              "iconColor": "rgba(0, 211, 255, 1)",
              "name": "Annotations & Alerts",
              "type": "dashboard"
            }
          ]
        },
        "editable": true,
        "gnetId": null,
        "graphTooltip": 0,
        "id": null,        //id = null   意为建立一个新的Dashboard
        "links": [],
        "panels": [
          {        //从这里开始
            "aliasColors": {},
            "bars": false,
            "dashLength": 10,
            "dashes": false,
            "fill": 1,
            "gridPos": {
              "h": 8,
              "w": 12,
              "x": 0,
              "y": 0
            },
            "id": 1,   //需要保证每一张panel的id不同
            "legend": {
              "avg": false,
              "current": false,
              "max": false,
              "min": false,
              "show": true,
              "total": false,
              "values": false
            },
            "lines": true,
            "linewidth": 1,
            "nullPointMode": "null",
            "paceLength": 10,
            "percentage": false,
            "pointradius": 2,
            "points": false,
            "renderer": "flot",
            "seriesOverrides": [],
            "stack": false,
            "steppedLine": false,
            "targets": [
              {
                "expr": "sum({__name__=~\"replica_app_pegasus_put_qps:.*\",cluster=\"c4tst-prometheus\",pegasus_job=\"replica\",port=\"37801\",service=\"pegasus\"})",    //这里填写要查看的数据（和prometheus的查找语言promQL相同的方式）
                "format": "time_series",
                "intervalFactor": 1,
                "refId": "A" //这里按照字典序排序
              }   //这一个大括号代表一个查询
            ],
            "thresholds": [],
            "timeFrom": null,
            "timeRegions": [],
            "timeShift": null,
            "title": " put_qps", //panel名称
            "tooltip": {
              "shared": true,
              "sort": 0,
              "value_type": "individual"
            },
            "type": "graph",
            "xaxis": {
              "buckets": null,
              "mode": "time",
              "name": null,
              "show": true,
              "values": []
            },
            "yaxes": [
              {
                "format": "short",
                "label": null,
                "logBase": 1,
                "max": null,
                "min": null,
                "show": true
              },
              {
                "format": "short",
                "label": null,
                "logBase": 1,
                "max": null,
                "min": null,
                "show": true
              }
            ],
            "yaxis": {
              "align": false,
              "alignLevel": null
            }
          }     //到这里结束，表示一个panel
        ],
        "refresh": false,
        "schemaVersion": 18,
        "style": "dark",
        "tags": [],
        "templating": {
          "list": []
        },
        "time": {
          "from": "now-6h",
          "to": "now"
        },
        "timepicker": {
          "refresh_intervals": [
            "5s",
            "10s",
            "30s",
            "1m",
            "5m",
            "15m",
            "30m",
            "1h",
            "2h",
            "1d"
          ],
          "time_options": [
            "5m",
            "15m",
            "1h",
            "6h",
            "12h",
            "24h",
            "2d",
            "7d",
            "30d"
          ]
        },
        "timezone": "",
        "title": "pegasus-prometheus",           //title为Dashboard名称
        "uid": null,                 // null表示新建
        "version": null           // null 表示新建
      },
    "overwrite" : true
}
          
```
看到如下response即表示创建成功，进入Gafana就可以看到创建好的Dashboard和panel了。

![postman-getReply](/assets/images/postman-getReply.png)
#### json文件
现在有一份Grafana.json文件，里面按照falcon_screen.json将需要的panel都添加了，发送请求之后可以看到70+张panel已经成功创建。
当前json文件中搜索条件为如下形式：

```
"targets": [
              {
                "expr": "zion_profiler_RPC_RRDB_RRDB_GET_latency_server{cluster=${cluster.name},pegasus_job=\"replica\",port=${replica.port},service=\"pegasus\"}",
                "format": "time_series",
                "intervalFactor": 1,
                "refId": "A"
              }
            ],
```
可能需要后续的脚本文件将对应的\${cluster.name}与\${replica.port}补充完整
## ONEBOX与集群部署

 1. 如果使用onebox进行测试，将src/server/config-server.ini中perf_counter_enable_prometheus改为true
 2. 在集群部署的时候，在.cfg文件中添加 perf_counter_enable_prometheus = true以及 prometheus_host = your_host

## TODO
添加脚本文件，使得直接运行脚本文件即可成功创建Dashboard和panel，不用再使用类似postman等工具帮助执行，同时需要将json文件中需要的内容补充完整。当前json文件中的部分数据在测试阶段没有接收到，后续可能要测试一下是否可以。

我们正在开发其他类型的可视化监控工具，以更好地帮助用户管理集群，敬请期待。
