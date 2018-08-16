---
layout: post
title: 阿里云ecs配置ftp服务及mysql远程连接
date: 2017-05-19 18:00:31
---

## ftp服务
- 使用filezilla server软件搭建
	参考文章：[http://www.5xiaobo.com/?id=528](http://www.5xiaobo.com/?id=528)
- 记得配置filezillaserver 的passive mode ，由于filezilla搭建的ftp服务器将命令与数据使用不同的端口进行传输，所以只打开配置允许21，23端口访问是不够的
![](http://ww1.sinaimg.cn/large/82cec9c6ly1fg1a28ru6cj20zm0blta6.jpg)
![](http://ww1.sinaimg.cn/large/82cec9c6ly1fg1a6qmlazj20e003ujr9.jpg)

## mysql 远程连接配置
- 打开安全组策略，在公网规则下新建允许3306端口的访问
![](http://ww1.sinaimg.cn/large/82cec9c6ly1fg1a8dbls1j20or017a9w.jpg)
- 在mysql中执行sql语句，解除用户只能在本地访问的限制,(以root用户为例)
	```sql
update user set host='%' where user='root' and host='localhost';
flush privileges;        #刷新权限表，使配置生效

	```
	或者新建一个用户
	```sql
grant all on *.* to 'yourname'@'%' identified by 'password';
flush privileges;
	```
- 如发现已打开端口3306的情况下依然不能访问，可以检查是否在ecs主机中打开了防火墙，如果打开了，则需要在防火墙中添加允许3306端口访问的规则

然后就可以远程连接到ecs中的mysql服务了
