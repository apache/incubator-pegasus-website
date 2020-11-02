---
permalink: docs/downloads/
---

We recommend downloading the signed source release that follows [ASF Release Policy](http://www.apache.org/legal/release-policy.html):

Package | Signature | Checksum | Release Notes |
---|---|---|---|
[Apache Pegasus 2.1.0](https://dist.apache.org/repos/dist/release/incubator/pegasus/2.1.0/apache-pegasus-2.1.0-source-release.zip) | [asc](https://dist.apache.org/repos/dist/release/incubator/pegasus/2.1.0/apache-pegasus-2.1.0-source-release.zip.asc) | [sha512](https://dist.apache.org/repos/dist/release/incubator/pegasus/2.1.0/apache-pegasus-2.1.0-source-release.zip.sha512) | [Apache Pegasus 2.1.0 Release Notes](https://cwiki.apache.org/confluence/display/PEGASUS/Apache+Pegasus+2.1.0+Release+Notes)

You can also download the sources via git clone:

```bash
git clone {{ site.pegasus_github_url }}.git --recursive
cd pegasus
git checkout -b v2.1.0 v2.1.0
git submodule update
```
