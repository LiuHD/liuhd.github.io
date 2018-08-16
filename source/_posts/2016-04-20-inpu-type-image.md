---
layout: post
title: 神奇的图片类型input type=image
date: 2016-04-20
---

# 神奇的图片类型 input type=image

这两天的工作是给一个客户的项目改bug，项目是用laravel框架做的，还挺大，本来以为正在学习lel的我能学到不少东西，然而，图样！拿到代码的我看了一晌就欲哭无泪了，

我擦！这代码怎么能这么乱？！是坨屎么！！！

我擦！这种写法也行？！

我擦！这中英文混合命名法是怎么做到这么切换自如的？！

天哪，这神奇的代码是怎么跑了这么久的啊！？

然而，这一切都不及我发现的原作者的表单写法。到目前为止，所有的表单提交，一个`type="submit"`的`input`或`button`我都没有看到，但是这些表单竟然都神奇的工作的好好的，我们一起来膜拜一下大神的代码：
    
>大牛的前端表单代码
    
```html
<form>
    <input style="width:102.4px; height:38.4px;" 
            name="imageField3" 
            type="image"
            id="imageField3" 
            src="/p-explorer/img/del.jpg" onClick='return confirm("确认删除吗?" +
               "此操作将会产生以下影响:\n"+"1.修改楼盘对接经理\n"+"2.修改成员归属");'>
    <input style="width:102.4px; height:38.4px;" 
            name="clientlist" 
            type="image"
            id="clientlist" 
            src="/p-explorer/img/khlb.jpg">
    <input style="width:102.4px; height:38.4px;" 
            name="imageField" 
            type="image"
            id="imageField" 
            src="/p-explorer/img/save.jpg">
</form>
```
    
> 大牛的后台表单处理代码:
    
```php
    if($request->has('imageField3_x'))
    {
        //...
    }
    if($request->input('clientlist_x'))
    {
        //...
    }
    if($request->input('imageField_x'))
    {
        //...
    }
```

点击任意一个图片后台都能做出相应的响应，而我们却没有找到明显的提交的入口，是不是很神奇？
其实，`&lt;input&gt;`标签的`type`属性有一个`image`的可取值，当取值为`image`时，`&lt;input&gt;`被称作图片按钮，点击这些图片，表单就会立即提交，且提交的数据中除了正常的表单项还有鼠标单击时在该图片上的水平和垂直偏移量，也就是我们看到的后端处理代码中的`imageField3_x`等表单中本不存在的项。
引自[W3School](http://www.w3school.com.cn/tags/att_input_type.asp)的解释:
>如果 type 属性设置为 image，当用户单击图像时，浏览器将以像素为单位，将鼠标相对于图像边界的偏移量发送到服务器，其中包括从图像左边界开始的水平偏移量，以及从图像上边界开始的垂直偏移量。

对于这种用法，其实比较适合一个表单有多种动作，将form的`action`置空，表单默认提交到**自身地址**之后，在后端逻辑代码中像上面代码中那样根据图片水平或垂直偏移量是否存在来判断具体要执行什么动作。这虽然不是什么冷门知识，但是我是真的第一次知道，只怪当初没有完全的看一遍标签属性。希望你们不会遇到这样的坑。。。