---
permalink: docs/downloads/
---

We recommend downloading the signed source release that follows [ASF Release Policy](http://www.apache.org/legal/release-policy.html):

[2.1.0-src]: https://www.apache.org/dyn/closer.cgi?path=/incubator/pegasus/2.1.0/apache-pegasus-2.1.0-incubating-src.zip
[2.1.0-asc]: https://downloads.apache.org/incubator/pegasus/2.1.0/apache-pegasus-2.1.0-incubating-src.zip.asc
[2.1.0-sha]: https://downloads.apache.org/incubator/pegasus/2.1.0/apache-pegasus-2.1.0-incubating-src.zip.sha512
[2.1.0-rn]: https://cwiki.apache.org/confluence/x/cxbZCQ
[2.2.0-src]: https://www.apache.org/dyn/closer.cgi?path=/incubator/pegasus/2.2.0/apache-pegasus-2.2.0-incubating-src.zip
[2.2.0-asc]: https://downloads.apache.org/incubator/pegasus/2.2.0/apache-pegasus-2.2.0-incubating-src.zip.asc
[2.2.0-sha]: https://downloads.apache.org/incubator/pegasus/2.2.0/apache-pegasus-2.2.0-incubating-src.zip.sha512
[2.2.0-rn]: https://cwiki.apache.org/confluence/display/PEGASUS/Apache+Pegasus+2.2.0+Release+Notes

Name | Package | Signature | Checksum | Release Notes |
---|---|---|---|---|
Apache Pegasus 2.1.0 | [Source][2.1.0-src] | [asc][2.1.0-asc] | [sha512][2.1.0-sha] | [2020-11-30][2.1.0-rn]
Apache Pegasus 2.2.0 | [Source][2.2.0-src] | [asc][2.2.0-asc] | [sha512][2.2.0-sha] | [2021-06-27][2.2.0-rn]

You can also download the sources via git clone:

```bash
git clone {{ site.pegasus_github_url }}.git --recursive
cd incubator-pegasus
git checkout -b v2.2.0 v2.2.0
git submodule update
```
