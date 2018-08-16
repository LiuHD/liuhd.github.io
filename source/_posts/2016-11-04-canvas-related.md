---
layout: post
title: HTML5 Canvas的一些坑
tags: 
    - canvas 
    - javascript
date: 2016-11-04
---
当使用canvas渲染多张图片时，很多同学喜欢使用image对象的onload事件来确保图片的渲染，但是由于图片大小，格式等原因可能造成图片加载完成的先后并不是代码里写的次序，所以会产生本来要在上层的图片渲染在下层，甚至可能被遮挡，完全看不见。代码如改动前。

因此，可以从加载次序上着手，使用onload事件的回调函数强制性决定图片的加载顺序。代码如改动后。

改动前:

```javascript
var c=document.getElementById("myCanvas");
var ctx=c.getContext("2d");
var img = new Image();
var img2 = new Image();
img.onload = function() {
	c.width = this.width;
	c.height = this.height;
	ctx.drawImage(img,10,10);
	console.log("load1");
	
}
img2.onload = function() {
	ctx.drawImage(img2,50,50);	
	console.log("load2");
}
img.src = '../img/test1.png';
img2.src = '../img/test2.jpg';
```

改动后:

```javascript
var c=document.getElementById("myCanvas");
var ctx=c.getContext("2d");
var img = new Image();
var img2 = new Image();
img.onload = function() {
	c.width = this.width;
	c.height = this.height;
	ctx.drawImage(img,10,10);
	console.log("load1");
	img2.src = '../img/test.png';
}

img2.onload = function() {
	ctx.drawImage(img2,50,50);	
	console.log("load2");
}
img.src = '../img/test2.jpg';
```
