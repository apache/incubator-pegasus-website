---
title: 我如何为 Pegasus 编写网站？
layout: post
author: 吴涛
---

这篇文章主要讲述我搭建本网站的所做所想，可以对想要参与的小伙伴提供参考。

-----

## 为什么要为 Pegasus 编写网站？

许多人以为开源软件的核心就是非盈利性地把源代码开放给大家看，重点在于宣传自己的“非盈利性”。
所以把项目开放在 Github 之后即完成了所谓 “开源” 这一目标。其实这种观点是错误的。
“开源”不是为了让大家来学习你的代码（代码是为功能服务的，没有所谓好或不好），而是为了让大家更好地使用你的代码。

对使用者而言，开源软件意味着我们能够免费地使用它或它的某个部分，但如果它并不好用，很难用，
或者出现问题用户无法找到解决的途径，那么“开源”并没有帮助它成为一个更好的软件，而只是吸引到了大众的视线，
对公司而言是完成了技术宣传的指标。

优秀的开源软件，首先需要是一个优秀的软件，并且需要通过开源让这个软件变得更优秀。仅仅只是放在
Github，那么它和一个非商业的闭源软件没有本质上的区别。Pegasus 希望称为一个优秀的开源软件，
而非一份“非盈利性代码仓库”。

这个网站的目的就是为此，我希望大家能更舒适地阅读文档，更轻松地了解 Pegasus，更容易地参与 Pegasus
的社区。

## 这个网站部署在哪里？

这个网站使用 Github Pages 部署。项目地址在：[apache/incubator-pegasus-website](https://github.com/apache/incubator-pegasus-website)。
master 分支的代码就对应这个网站的全部内容。提交至 master 后，Github Page 会自动将网站部署至 <https://pegasus.apache.org/> 上。

## 开发环境

我们使用 [jekyll](https://jekyllrb.com/) 静态网页框架，使用 [Bulma](https://bulma.io) 作为前端组件库。

jekyll 是用 Ruby 开发的，所以你首先需要安装 Ruby，首选的方法是 [用 RVM 安装](http://rvm.io/)。

中国大陆用户可能在获取 Ruby 依赖库（Ruby Gem）的时候遇到政策性的网络问题，你可以使用 [Ruby 中国镜像站](https://gems.ruby-china.com/)。

最后你只需要在本地安装 jekyll 和 bundler：

```bash
cd pegasus.apache.org
gem install bundler jekyll
bundle
jekyll serve
```

使用 `jekyll serve` 命令后，你可以在本地浏览器打开 `http://127.0.0.1:4000` 调试网页。

```txt
       Jekyll Feed: Generating feed for posts
                    done in 6.514 seconds.
 Auto-regeneration: enabled for '/home/mi/docs-cn'
    Server address: http://127.0.0.1:4000
  Server running... press ctrl-c to stop.
```

## 感谢

本站最初基于 [chrisrhymes/bulma-clean-theme](http://www.csrhymes.com/bulma-clean-theme/)，
它为我提供了如何使用 bulma 和 jekyll 的示例。虽然最终实际使用这个模板的地方不多，
但文档和博客部分的配色与样式还是有所借鉴，还有整个网站的字体也是沿用该模板。
