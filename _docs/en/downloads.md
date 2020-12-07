---
permalink: docs/downloads/
---

We recommend downloading the signed source release that follows [ASF Release Policy](http://www.apache.org/legal/release-policy.html):

[2.1.0-src]: https://www.apache.org/dyn/closer.cgi?path=/incubator/pegasus/2.1.0/apache-pegasus-2.1.0-incubating-src.zip
[2.1.0-asc]: https://downloads.apache.org/incubator/pegasus/2.1.0/apache-pegasus-2.1.0-incubating-src.zip.asc
[2.1.0-sha]: https://downloads.apache.org/incubator/pegasus/2.1.0/apache-pegasus-2.1.0-incubating-src.zip.sha512
[2.1.0-rn]: https://cwiki.apache.org/confluence/x/cxbZCQ

Name | Package | Signature | Checksum | Release Notes |
---|---|---|---|---|
Apache Pegasus 2.1.0 | [Source][2.1.0-src] | [asc][2.1.0-asc] | [sha512][2.1.0-sha] | [Release Notes][2.1.0-rn]

You can also download the sources via git clone:

```bash
git clone {{ site.pegasus_github_url }}.git --recursive
cd pegasus
git checkout -b v2.1.0 v2.1.0
git submodule update
```
