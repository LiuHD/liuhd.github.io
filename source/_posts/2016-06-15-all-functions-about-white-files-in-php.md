---
layout: post
title: 细解php文件写入
date: 2016-06-15
---

![img](http://7xsmk5.com1.z0.glb.clouddn.com/16-6-15/57618793.jpg)
最近在学习composer的原理，其中有一步是将根据命名空间解析好的文件加载路径统一写入到一个文件里，这样以后只要检测到这个文件没有变化，那么就可以通过这个文件里面的记录直接进行文件加载了。在这一步里就牵涉到了文件写入的问题，在php中，针对文件写入功能，提供了很多相关的函数。之前自己一直都理解的很笼统，所以打算认真的归纳一下。
php中操作文件分三步。
先上一段示例代码。
```php
//打开文件名为test.txt的文件
$fp=fopen('test.txt','w+');
//锁定文件，避免多个程序同时对文件进行操作
flock($fp,LOCK_EX);
//将“Hello world”写入到test.txt中
fwrite($fp,'Hello world');
//解锁文件
flock($fp,LOCK_UN);
//关闭文件，释放资源
fclose($fp);
```
下面开始细解。
### ​第一步，打开文件，调用`fopen()`;

```
resource  fopen ( string  $filename , string  $mode [, bool $use_include_path = false [, resource $context ]] )
```

​例如，打开一个名为a.txt的文件，只需调用`fopen('a.txt','r+')`；函数会返回一个资源类型的变量。其中传入的第二个参数是打开文件选用的模式，有`r`,`r+`,`w`,`w+`等，具体的可以参考[php.net](http://php.net/manual/zh/function.fopen.php)中的定义。

### 第二步，操作文件，调用`fwrite`,`fread`,`feof`,`fgets`等函数进行操作
写入文件--fwrite
读取文件--fread
读取文件内容的一部分--fgets
锁定文件--flock

### 第三步，关闭文件,调用`fclose`;
