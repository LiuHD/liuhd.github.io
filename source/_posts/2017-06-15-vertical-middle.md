---
layout: post
title: 我对于vertical-align middle的理解
date: 2017-06-15 18:00:31
---
vertical-align属性本意是应用于将于文本并列排版的(display:inline-block)图片,区块等与文本进行对齐,
也就是说这些属性应该应用于图片或者区块上面,而不是包含的元素上.

如果想要文本垂直居中,在没有与他并列的元素的情况下,就要创造一个元素与其并列,如: 
<!-- more -->
<p style="width: 1px;height: 500px;">我这么小, 跟她对齐,容易么我 <img src="../../images/apple-touch-icon-next.png"></p>