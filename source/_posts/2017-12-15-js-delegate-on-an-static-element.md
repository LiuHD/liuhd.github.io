---
title: delegate 绑定事件的冒泡拦截问题
date: 2017-12-15 18:00:31
tags: ["delegate"]
---

对于一个静态的元素(在页面完成加载时已经存在，非后期动态生成)，如果用delegate的话，会出现无法阻止该事件冒泡的情况，具体的就是delegate方式绑定事件本身的工作方式就是把事件绑定在父元素上，然后在事件产生的时候，`逐级冒泡`到该父元素，父元素才会触发这个事件，请注意这个事件在触发的时候已经是`逐级冒泡`之后的事了，所以在事件处理函数里拦截什么的都不会起作用。
<!-- more -->
话不多说，直接上测试代码。

```html
<!DOCTYPE html>
<html>

<head>
<meta charset="UTF-8" />

<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css"></link>
<style id="webmakerstyle">
.item {padding: 5px;background: #ccc;display: inline-block;margin-right:5px;}
</style>
</head>
<body>
<div class="container">
	<button class="add-list">添加list
	<i class="fa fa-mouse-pointer fa-2x" aria-hidden="true"></i>
	</button>
	<br>
	<p class="list">
		<button class="add-item">添加item</button>
		<span class="item">item</span>	
	</p>
</div>

<script src="https://code.jquery.com/jquery-3.2.1.min.js"></script>
<script>
$('.add-list').click(function() {
	$($('.list')[0]).clone().appendTo($('.container'));
	console.log('first');
});

$('.container').on('click', '.fa-mouse-pointer', function() {
	console.log('then');
	return false;
})
$('.container').on('click', '.add-item', function() {
	$($(this).parent().find('.item')[0]).clone().appendTo($(this).parent());
	return false;
});

$('.container').on('click', '.item', function(){
	console.log(2);
	return false;
});

$('.container').on('click', '.list', function(){console.log(1)});
//# sourceURL=userscript.js
</script>
</body>
</html>
```