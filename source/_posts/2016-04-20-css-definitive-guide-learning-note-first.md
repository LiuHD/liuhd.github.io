---
layout: post
title: 《CSS权威指南》学习笔记一
date: 2016-04-20
---
>css的全拼为`cascade style sheet`,直译为层叠样式表。CSS通过为具有相同特征的html元素在文档中的一个位置统一定义样式，取代html的原始时代为每个元素单独描述样式，以及将样式描述与元素结构混合的模式。层叠即，当多个css定义项为同一html元素定义了同一种样式时（例如A定义项与B定义项都为某一p元素定义了颜色属性），这些定义项在同一元素上发生层叠，根据特定标准确定的权重，判断究竟将哪个定义项应用于该元素。

>css的核心之一就是选择器。选择器总结，元素选->p,样式类选->.class_name,id选->#id,attribute选：=，部分attribute选：~=、*=、|=、^=、$=

1. 子块级元素的追评margin+border+padding+width必然等于父级块元素的width.
2. 在css中,水平方向上，width只能是content的宽度，不包括margin,border以及padding。
3. 对于块级元素的水平宽度属性，只有width以及margin可设置为auto，其他的要么设置成具体值，要么默认为0.
4. width，padding不能为负值，margin可以，可以用负值的margin做一些神奇的效果
5. css中有一个标准是允许浏览器设定一个width的最小值，元素的width不能比这个小，而这个最小值具体是多少却是因浏览器而异。
6. 如果width和margin都设置为具体值，即过分受限，则用户代理将把margin-right重置为auto.