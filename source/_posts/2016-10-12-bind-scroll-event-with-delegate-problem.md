---
layout: post
title: jquery中使用delegate绑定scroll事件却捕捉不到的问题
tags: 
    - jquery
    - delegate
    - 事件
date: 2016-10-12
---

```javascript
function delegate(selector, type, data, func);
```

主要是因为delegate的绑定是绑定到自身的，但是事件的触发却是由子元素(selector指定的)，而且是必须由该子元素触发(其他子元素就不行)，触发的原理是事件的冒泡机制，
即使该父元素本身发生该事件了，或者父元素的其他子元素发生该事件了也不会触发该，就是这么特殊。

由于scroll不是冒泡类型的事件，所以不会触发。
要想达到绑定scroll到一个元素监控其滚动，可以使用on，或者bind，或者scroll

```javascript
window.scroll(func);
window.on(null, 'scroll', func);
window.bind('scroll', func);
```

也就是说，想绑定到子元素，同时能触发父元素的滚动事件是不可能的。