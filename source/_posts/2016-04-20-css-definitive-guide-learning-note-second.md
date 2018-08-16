---
layout: post
title: 《CSS权威指南》学习笔记之水平格式化
date: 2016-04-20
---
1. 水平定位属性分七个部分：margin-left,padding-left,border-left,width,padding-right,border-right,margin-right.这七个部分的和总要等于父元素的内容宽度值。
2. margin属性可为负值，其他属性都不能是负值.
3. margin属性以及width属性可设置为auto,padding,padding不能设置为auto，他们要么设置为具体值，要么默认为0.
4. 块级元素可分为非替换块级元素(最典型的是p元素)和替换块级元素(eg.img元素)两种。
4. 对于非替换块级元素，width和margin，设置为auto的情况可分为三种：
    1. 只有一个auto
        - width设置为auto的情况，这种情况是最常见的，内容宽度会铺满
        - margin中的一个设置为auto的，该margin自动延伸至铺满
    2. 有两个auto
        - 两个margin的情况，内容会居中
        - 一个width一个margin的情况，width会延伸至铺满，设置为auto的margin其实显示是0
    3. 三个都是auto
        - 这种情况最常见，width会铺满，两个margin都是0
    4. 都没有设置值
        - 这种情况表现同第三种一样
5. 对于替换块级元素，情况与非替换块级元素唯一不同的就是，当width设置为auto时，内容宽度并不会铺满，而是会等于块级元素的子元素的自身的宽度属性，以img元素为例，`width=auto`的情况，内容宽度会设置为该图片的默认宽度，只有当width为明确的值时，内容宽度才会发生改变。当然，对于图片元素来说，当width设置为固定值切不等于图片的默认宽度值时，元素的height也会按比例发生变化。
6. 尽量不要用百分比来设置width，因为没有办法yongwidth来控制全部的属性，例如border的宽度必须用em,px等明确。
