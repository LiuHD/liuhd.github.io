---
layout: post
title: vue.js 中过滤器传参的注意事项
tags: ["vue", "vue.js", "filter"]
---

vue.js的过滤器可以传入多个参数,每个参数也可以用函数计算，这个时候要注意，用函数计算的参数在书写时，其函数被传入的参数如果有多个，则中间不能有空格

<!-- more -->
```javascript
	//要写成：
	{ {value | replace getReg(a,b,c)} }

	//而不是
	{ {value | replace getReg(a ,b ,c)} }
```

因为如果加空格，就会被解析成这个过滤器的其他参数，如上面错误的写法，会被解析成三个参数传递给replace filter函数：`getReg(a` , `b` , `c`,自然什么也解析不出来