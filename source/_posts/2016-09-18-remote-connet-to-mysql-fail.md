---
layout: post
title: 远程连接到mysql包10038错误的问题
date: 2016-09-18
---

错误原因是没有将远程主机中的3306端口打开，因此将远程主机的3306端口开放即可

### windows主机
可参考[这篇文章](http://jingyan.baidu.com/article/63acb44add614761fcc17ec2.html)

### ubuntu
可参考[这篇文章](http://www.linuxdiyf.com/linux/15206.html)

对于ubuntu主机，只要在mysql的配置文件中打开3306的绑定即可，文中提到的路径
`/etc/mysql/mysql.conf.d/mysqld.cnf`
如果没找到，可以找一下
`/etc/mysql/conf.d/my.cnf`
将其中的bind address行注释即可。