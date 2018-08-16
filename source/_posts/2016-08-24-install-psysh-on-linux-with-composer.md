---
layout: post
title: 在linux上安装psysh
tags: 
    - pysh
date: 2016-08-24
---

按照这篇文章[PsySH——PHP交互式控制台](http://vergil.cn/archives/psysh)中的方法安装psysh，但是在设置全局调用时发现不可用，在添加路径到path全局变量时 的格式问题

```bash
echo 'export PATH="/Users/{用户名}/.composer/vendor/psy/psysh/bin:$PATH"' >> ~/.bashrcfile:/D:/vagrant-prometheus/mjjshouse/README
```