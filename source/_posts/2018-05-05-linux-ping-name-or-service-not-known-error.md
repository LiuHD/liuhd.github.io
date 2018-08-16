---
title: linux ping报错Name or service not known
date: 2018-05-05
tags: [linux,ping]
---

vagrant linux 虚拟机设置静态ip以后忘记设置dns，ping的时候会报错：`Name or service not known`

添加dns即可
<!-- more -->
```
sudo vim /etc/resolv.conf
nameserver 8.8.8.8
nameserver 8.8.4.4
```