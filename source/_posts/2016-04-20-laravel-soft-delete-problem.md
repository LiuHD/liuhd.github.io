---
layout: post
title: 关于Laravel中使用orWhere查询会返回已删除条目的问题
date: 2016-04-20
---
在laravel的model中，可以引入并使用`Softdeletes`，即软删除功能，所谓软删除就是当程序对数据库中的一条记录执行删除操作时，并不是真的将这条记录从数据库中删除掉，而是相应的在这个记录的事先指定的字段中添加标识，表明该字段已被软删除，而程序之后访问数据库所执行的查询都会跳过这些记录，在laravel中，一般我们都定义这一功能所对应的字段为`deleted_at`。


我们以`User`类为例，在定义这个model时引入`softDelete`,代码如下：

```php
class User extends Model{
use SoftDeletes;
dates=['deleted_at'];
}
```

**除此之外还要在数据库users表中增加deleted_at字段，并设置为时间戳类型，可为空****，这样就添加了软删除功能，可以进行软删除了。

## 问题描述

当执行对一个User实例`$user`执行删除操作时，laravel程序自动对数据库中对应记录的`deleted_at`字段赋值，标识它已被删除，接下来进行的查询就会自动跳过该字段。


而我们的问题恰恰就出在这里，对于已经添加`SoftDelete`(即软删除)的Model，如果使用Eloquent ORM进行`orWhere`查询，有时会出现已经被删除的字段出现在我们的搜索结果中，是不是很惊讶呢？
博主也是一样的，还以为发现了什么bug，最后发现其实这与laravelEloquentORM查询的实现有关，让我们从一个简单地Eloquent 查询开始。

我们首先在数据库中准备好一下两条数据

#### 我是用户表

name | mobile | deleted_at
---|---|---
Martin|87654321|	 
John|12345678|2015-12-06 16:23:34

我们对User类执行查询如下：

```php
$users=User::where('name','liuhuidong')->first();
```

这种情况下出来的结果是正常的，会返回相应的结果，我们分析一下这个语句。
在这条语句中，为了表示方便，我们暂且称“->”符号为“链”，在链之前查询语句

```
User::where('name','liuhuidong')
```

被称为查询构造器的条件构建部分，在链之后的部分`first()`被称为获取器，其实在获取器之前，语句返回的是一个查询构造器的类，为QueryBuilder,在laravel项目中的完整路径是

```
Illuminate\Database\Query\Builder
```

这个类有一个函数很实用，即`toSql()`，这个函数可以返回我们用Eloquent ORM构造的查询真正执行的sql语句，

```php
echo User::where('name','Martin')->toSql();
```

结果如下：

```sql
select * from `users` where `deleted_at` is null and `name` = 'Martin'
```

然后我们加入`orWhere`

```php
$users=User::where('name','Martin')->orWhere('mobile','12345678')->first();
```

这时我们发现已经被删除的第二条字段也出现在了查询结果中。Why？别着急，我们对这个查询同样进行sql语句打印，结果如下

```sql
select * from `users` where `deleted_at` is null and `name` = 'Martin' or `mobile` = '12345678'
```

## 分析

看到这个sql语句我们就知道原因出在哪里了，原因就在于QueryBuilder生成的sql语句的过程是先生成一个

```sql
`table`.'deleted_at'=null
```

然后后面再添加上其他的语句，如果用的是where筛选，就用and连接，如果用orWhere筛选，就用or连接，由于sql语句中，and的执行优先级大于or，因此上句中

```sql
`deleted_at` is null and `name` = 'Martin' 和`mobile` = '12345678'
```

会分别执行，然后再把两者的结果集合。（sql查询的实现过程可能并非如此，但是我们这样理解有利于解释我们的问题），这就导致了这样的结果。
知道了原因，我们就能知道破解问题的办法了，

### 解决

我们可以把sql语句改成

```sql
select * from `users` where `deleted_at` is null and (`name` = 'John' or `mobile` = '13817037826')
```

根据这个我们就可以设计eloquent查询语句了。可以使用eloquent的高级where群组化参数查询

```php
User::where(function($query)){
$query->where('name','='.'Martin')
->orwhere('mobile','like','12345678');})
->get();
```

我们再次打印sql语句：

```sql
select * from `users` where `deleted_at` is null and (`name` = 'Martin' or `mobile` ='12345678')

```
可以看到，除了Eoquent查询自带`的deleted_at`筛选条件之外语句的其他部分已经被括号括了起来，保证了它们的优先执行，这样问题就迎刃而解了。

注：这里用到了php闭包函数的用法，博主也是刚刚了解，有兴趣的朋友可以深入了解一下。具体如何在其中引入参数，是的查询的参数变为动态的，可以参看这篇文章下FiveSay的回答。

### 结尾

laravel的创始人Taylorotweel并不认为这是个bug，而认为这是基于sql语句查询中`or`和`and``作用优先级不同导致的无法避免的事，但是，发现该问题的开发者依然要求Taylor在文档中添加相关解释，最后，Taylor做出了妥协，博主已经确认过，在最新的laravel5.1的Eloquent ORM 入门一节，已经有了这一问题的note，有兴趣的朋友可以去看看:[传送门](http://www.golaravel.com/laravel/docs/5.1/eloquent/#querying-soft-deleted-models)

放上github上该issue的讨论:[点我](https://github.com/laravel/framework/issues/1945)
