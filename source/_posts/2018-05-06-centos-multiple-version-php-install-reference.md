---
title: centos中安装多版本php并同时用于nginx
date: 2018-05-06 14:22:55
tags: [centos,php,php-fpm,yum,nginx]
---

在新建的虚拟机中安装了php7, 安好了才发现一些老一点的项目跑不了了, 由于php7版本较php5版本有了较大修改, 很多函数已经不是废弃, 而是移除了, 导致很多问题. 只好再安装一个php版本了, 我要安装的是php5.6, 在网上搜了linux中的php多版本管理, 推荐了phpenv, 搞了一通, 没有结果, 只好换个方法了, 直到我发现了[这篇文章](https://www.tecmint.com/run-multiple-websites-with-different-php-versions-in-nginx/), 直接解决. 下面给大家介绍安装及配置过程.

<!-- more -->
这种情况下其实可以通过直接在一个linux系统中通过yum等工具安装好不同的PHP版本, 分别注册PHP-FPM服务, 配置到服务器中即可.

## 实验环境
- CENTOS7
- Nginx v1.12.2
- PHP7(设置为系统默认PHP版本)和PHP5.6
- 服务器IP 192.168.56.100

## 安装PHP7与PHP5.6
1. 首先为yum引入两个库: EPEL与REMI, 因为这个两个库为我们提供最新的PHP版本源, CENTOS 自带的yum库中PHP版本都太老旧了.
```
# yum install https://dl.fedoraproject.org/pub/epel/epel-release-latest-7.noarch.rpm
# yum install http://rpms.remirepo.net/enterprise/remi-release-7.rpm
```
2. 安装php71
```bash
# yum-config-manager --enable remi-php71  [Default]
# yum install php php-common php-fpm
# yum install php-mysql php-pecl-memcache php-pecl-memcached php-gd php-mbstring php-mcrypt php-xml php-pecl-apc php-cli php-pear php-pdo
```
第一句用于启用PHP源remi-php71

安装php56
```bash
# yum install php56 php56-php-common php56-php-fpm
# yum install php56-php-mysql php56-php-pecl-memcache php56-php-pecl-memcached php56-php-gd php56-php-mbstring php56-php-mcrypt php56-php-xml php56-php-pecl-apc php56-php-cli php56-php-pear php56-php-pdo
```

在linux中执行`php -v`, 验证一下, 当前的php版本应该是7.1

3. 安装好之后, 下面就要配置php-fpm与php56-php-fpm, 他们是php的Fastcgi进程管理器, linux中web服务器调用php处理就是通过他们.
好了,开始配置吧.

两个php版本分别对应的配置文件为
- php-fpm (default 7.1) – /etc/php-fpm.d/www.conf
- php56-php-fpm – /opt/remi/php56/root/etc/php-fpm.d/www.conf

(很神奇, 安装php56版本的目录是在opt目录下)

打开两个配置文件, 更改如下代码

```
listen = 127.0.0.1:9000	[php-fpm]
listen = 127.0.0.1:9001	[php56-php-fpm]
```

如果是通过socket通信方式调用php-fpm的情况, 则更改代码如下
```
listen = /var/run/php-fpm/php-fpm.sock	[php-fpm]
listen = /opt/remi/php56/root/var/run/php-fpm/php-fpm.sock	[php56-php-fpm]
```

## 分别注册并启用两个版本的php-fpm服务
```
# systemctl enable nginx 
# systemctl start nginx 
# systemctl enable mariadb 
# systemctl start mariadb 
---------------- PHP 7.1 ---------------- 
# systemctl enable php-fpm 
# systemctl start php-fpm 
---------------- PHP 5.6 ----------------
# systemctl enable php56-fpm 
# systemctl start php56-php-fpm
```

使用php7的nginx服务器配置
```
server {
    listen 80;
    server_name example1.com www.example1.com;
    root   /var/www/html/example1.com/;
    index index.php index.html index.htm;
    #charset koi8-r;
    access_log /var/log/nginx/example1.com/example1_access_log;
    error_log   /var/log/nginx/example1.com/example1_error_log   error;
    location / {
    try_files $uri $uri/ /index.php?$query_string;
    }
    # pass the PHP scripts to FastCGI server listening on 127.0.0.1:9000
    location ~ \.php$ {
    root    /var/www/html/example1.com/;
    fastcgi_pass   127.0.0.1:9000;	#set port for php-fpm to listen on
    fastcgi_index  index.php;
    fastcgi_param  SCRIPT_FILENAME  $document_root$fastcgi_script_name;
    include         fastcgi_params;
    include /etc/nginx/fastcgi_params;
    }
}
````
使用php56的nginx服务器中配置
```
server {
    listen 80;
    server_name example2.com www.example2.com;
    root    /var/www/html/example2.com/;
    index index.php index.html index.htm;
    #charset koi8-r;
    access_log /var/log/nginx/example2.com/example2_access_log;
    error_log  /var/log/nginx/example2.com/example2_error_log   error;
    location / {
    try_files $uri $uri/ /index.php?$query_string;
    }
    # pass the PHP scripts to FastCGI server listening on 127.0.0.1:9000
    location ~ \.php$ {
    root    /var/www/html/example2.com/;
    fastcgi_pass   127.0.0.1:9001;	#set port for php56-php-fpm to listen on
    fastcgi_index  index.php;
    fastcgi_param  SCRIPT_FILENAME  $document_root$fastcgi_script_name;
    include         fastcgi_params;
    include /etc/nginx/fastcgi_params;
    }
}
```

添加测试网页文件
```
# echo "<?php phpinfo(); ?>" > /var/www/html/example1.com/info.php
# echo "<?php phpinfo(); ?>" > /var/www/html/example2.com/info.php
```

## 测试
之后访问example1.com/info.php 与 example2.com/info.php测试即可.
如果你是在本地虚拟机中配置的, 别忘了在本地host文件中添加

```
192.168.56.100   example1.com   example1
192.168.56.100   example2.com   example2
```

以上.