---
title: 开发工具栈
layout: page
---

## Clang-Format

我们使用 clang-format-3.9 来格式化代码。在 ubuntu 下安装 clang-format-3.9：

```bash
sudo apt-get install clang-format-3.9
```

clang-format 的配置文件参见 [src/.clang-format](https://github.com/XiaoMi/pegasus/blob/master/src/.clang-format) 。

## Clang-Tidy

我们使用 [clang-tidy](http://clang.llvm.org/extra/clang-tidy/) 来进行静态代码质量检查，它能够帮助我们 **发现代码中潜在的问题和风险**（例如 使用未初始化的变量，使用被 moved 的变量 等），**加强代码的可读性**，并且 **帮助你的代码和 pegasus 保持一致**。这需要你首先安装 clang-tidy（一般我们使用 >=3.8 版本）。

例如我们想要用其检查 rdsn 的字符串转换库 `rdsn/include/dsn/utility/string_conv.h`，我们可以检查其单元测试代码

```bash
cd rdsn
./run.sh build
clang-tidy-3.8 src/core/tests/string_conv_test.cpp -p builder -header-filter=.*
```

**注意**：clang-tidy 只能检查源文件（.cpp/.cc），不能检查头文件。直接检查头文件通常会看到 “Compile command not found” 的错误。

```bash
➜  rdsn git:(master) clang-tidy-3.8 include/dsn/utility/string_conv.h  -p builder -header-filter=.* 
Skipping /home/mi/git/release/pegasus/rdsn/include/dsn/utility/string_conv.h. Compile command not found.
```

**注意**：不可以直接在未构建的 pegasus/rdsn 下使用 clang-tidy 

```bash
➜  pegasus git:(master) ✗ clang-tidy-3.8 include/dsn/utility/string_conv.h -header-filter=.* 
Error while trying to load a compilation database:
Could not auto-detect compilation database for file "include/dsn/utility/string_conv.h"
No compilation database found in /home/mi/git/release/pegasus/include/dsn/utility or any parent directory
```

clang-tidy 需要 `-p` 选项指定 “compilation database” 来确定项目结构。在 Pegasus 和 rDSN 都构建完成后，我们可以在 `pegasus/src/builder/` 和 `rdsn/builder/` 下都看到一个名为 `compile_commands.json` 的文件，这是 cmake 构建生成的 [JSONCompilationDatabase](https://clang.llvm.org/docs/JSONCompilationDatabase.html)。

## CCache

我们支持用 ccache 加速编译，你需要做的只是安装 ccache。一旦 cmake 构建脚本检测到系统安装了 ccache，在编译时便会自动将编译结果缓存至 ccache 中。首次编译的速度可能较慢，但后续编译的速度会得到极大提升。
通常我们推荐使用 5GB 大小的缓存空间。

```bash
sudo apt install ccache
ccache -M 5G
```

## Gcov

我们使用 Gcov 和 Gcovr 来进行代码测试覆盖率的统计，请保证在你的系统上装有这两个工具。gcov 通常由 gcc 自带，而 gcovr 可以通过 pip 安装：

```bash
pip install --user gcovr
```

使用 gcovr 需要修改编译选项，我们提供一键式编译脚本，方法很简单：

```bash
cd rdsn
./run.sh test --enable_gcov
```

最终的覆盖率统计报告会以 html 的方式生成在 rdsn/gcov_report 内。

## Valgrind

遇到内存泄漏时我们使用 valgrind 检查和定位泄漏位置。

- 因为 pegasus 默认使用 tcmalloc(gperf) 优化内存分配，而 tcmalloc 不兼容 valgrind，所以编译时需要指定不链接 gperf 而使用 libc 的原生 malloc。

```bash
./run.sh build --disable_gperf -c
```

- 例如我们发现 meta server 发生了内存泄漏，我们可以针对 `dsn.meta.tests` 进行 valgrind 检查：

```bash
> cd builder/bin/dsn.meta.tests/
> valgrind --log-file=log.txt --tool=memcheck --leak-check=full ./dsn.meta.tests config-test.ini
```

运行测试后，valgrind 的结果会输出到 log.txt，通过分析日志 "definitely lost" 和 "possibly lost" 可以找到内存泄漏的原因。

## Heap Profiling

如何定位 Pegasus Server 中内存开销大的函数？我们使用 tcmalloc 和 pprof 工具。

* 首先你要保证编译时开启 tcmalloc（默认开启，但在 `--disable_gperf` 时禁用）。
* 在启动服务前，设置环境变量：

```bash
export TCMALLOC_SAMPLE_PARAMETER=524288
./run.sh start_onebox
```

* 使用 pprof 脚本即可查看 heap 信息

```bash
pprof --svg http://127.0.0.1:34801/pprof/heap > heap.svg
```

## 开发建议

总的来说，我们推崇 [Google Code Style](https://google.github.io/styleguide/cppguide.html)，除了：

* 函数的传出参数推荐使用引用而不是指针
* 头文件的 [Include Guard](https://en.wikipedia.org/wiki/Include_guard) 推荐使用 `#pragma once`
