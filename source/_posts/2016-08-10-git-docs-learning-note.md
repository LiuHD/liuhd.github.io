---
layout: post
title: Git官方文档阅读笔记
tags: ["git","笔记"]
date: 2016-08-10
---

### 高级命令

- git rm --cached filename

>只从git的track列表中删除

- git rm filename

>从git的track列表以及硬盘中删除

- git rm -f filename

>如果删除之前修改过并且已经放到暂存区域的话，则必须要用强制删除选项 -f

- git diff

>查看未加入暂存区的修改

- git diff --cached(or staged)

>查看已经加入暂存区的修改

- git mv old_name new_name

>rename操作

- git reset HEAD filename

>把一个已经暂存的文件标记为未暂存状态，便于分开提交，工作区修改不会丢失

- git checkout filename

>丢弃工作区的修改

- git commit --amend

>修改上一次的提交信息，并把暂存区的未提交的修改都提交到这个commit

- git remote add <shortname> <url>

>添加远程库

- git remote rename <old_name> <new_name>

- git remote show <remote>

> 这个命令列出了当你在特定的分支上执行 git push 会自动地推送到哪一个远程分支。 它也同样地列出了哪些远程分支不在你的本地，哪些远程分支已经从服务器上移除了，还有当你执行 git pull 时哪些分支会自动合并。

- git remote -v

>展示各remote详细链接

- git tag命令[相关](https://git-scm.com/book/zh/v2/Git-%E5%9F%BA%E7%A1%80-%E6%89%93%E6%A0%87%E7%AD%BE)

- git fetch remote branch

> git fetch操作会拉取远程库到本地，如果本地存在关联的分支，两个分支也不会合并，git pull相当于git fetch与git merge，大牛的操作都是使用fetch然后merge而不是直接pull，因为这样可以把合并的过程掌握在自己的手里

- git fetch --all

>抓取所有远程库

- git pull --rebase

> 解决push操作时，本地无法提交，因为远程有新的提交，而又无法pull，因为远程的提交里面有晚于本地提交的情况，加入--rebase参数，可以把pull的基点调整为最新的远程仓库，而非本地的版本，将远程代码pull下来后，再将本地未提交的commit放在远程代码commit的后面

- git stash list
 
>列出已经暂存的东西

- git config --global alias.<alias> <full name directive> 

>eg:`git config --global alias.co checkout`(为git checkout操作设置别名为git co)
>一个比较有用的别名设置 `git config --global alias.unstage 'reset HEAD --'; git config --global alias.visual '!gitk'`

- git checkout -b <new branch name> <branch based on>

>在指定的分支(branch based on)基础上新建一个名称为new branch name的分支

- git checkout --track <remote branch name>

>创建一个跟踪远程分支的本地分支

- git branch -u remote/branch

>设置当前分支跟踪的远程分支.
>当设置好跟踪分支后，可以通过 @{upstream} 或 @{u} 快捷方式来引用它。 所以在 master 分支时并且它正在跟踪 origin/master 时，如果愿意的话可以使用 git merge @{u} 来取代 git merge origin/master。

- git branch -vv

>关于分支的更多信息

- git push origin --delete branch

> 删除远程分支

- git rebase master

>变基操作，它的原理是首先找到这两个分支（即当前分支 experiment、变基操作的目标基底分支 master）的最近共同祖先 C2，然后对比当前分支相对于该祖先的历次提交，提取相应的修改并存为临时文件，然后将当前分支指向目标基底 C3, 最后以此将之前另存为临时文件的修改依序应用。[详情](https://git-scm.com/book/zh/v2/Git-%E5%88%86%E6%94%AF-%E5%8F%98%E5%9F%BA)

- git rebase --onto master server client

>以上命令的意思是：“取出 client 分支，找出处于 client 分支和 server 分支的共同祖先之后的修改，然后把它们在 master 分支上重演一遍”

- git rebase [basebranch] [topicbranch]

>不切换的目标分支，直接执行变基命令，直接将特性分支topicbranch变基到目标分支basebranch
- git merge branch

>合并一个分支到当前分支，fast-forward merge(快进合并)

### 文件 `.gitignore` 的格式规范如下：
- 所有空行或者以 ＃ 开头的行都会被 Git 忽略。
- 可以使用标准的 glob 模式匹配。
- 匹配模式可以以（/）开头防止递归。
- 匹配模式可以以（/）结尾指定目录。
- 要忽略指定模式以外的文件或目录，可以在模式前加上惊叹号（!）取反。


> 所谓的 glob 模式是指 shell 所使用的简化了的正则表达式。 
> 星号（*）匹配零个或多个任意字符；
> [abc] 匹配任何一个列在方括号中的字符（这个例子要么匹配一个 a，要么匹配一个 b，要么匹配一个 c）；
> 问号（?）只匹配一个任意字符；
> 如果在方括号中使用短划线分隔两个字符，表示所有在这两个字符范围内的都可以匹配（比如 [0-9] 表示匹配所有 0 到 9 的数字）。 
> 使用两个星号（*) 表示匹配任意中间目录，比如a/**/z 可以匹配 a/z, a/b/z 或 a/b/c/z等。

git log 后可跟很多参数，不过大多数都属于定制显示日志的样式或者限制日期，描述长短等，具体参考:[点我](https://git-scm.com/book/zh/v2/Git-%E5%9F%BA%E7%A1%80-%E6%9F%A5%E7%9C%8B%E6%8F%90%E4%BA%A4%E5%8E%86%E5%8F%B2)
- git log --graph

不懂git文件快照存储原理？看[这篇](http://liuhui998.com/2011/03/17/git-adventures-index-commit/)
