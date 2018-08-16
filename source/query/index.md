---
title: query
date: 2017-10-18 18:14:20
format: false
---
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, minimal-ui">
    <title>查询自习室|河师大掌中校园</title>
    <link href="http://cdn.bootcss.com/weui/0.4.2/style/weui.css" rel="stylesheet">
    <!--<link rel="stylesheet" href="../css/weui.css">-->
</head>
<style type="text/css">
    .action_sheet_button {
        margin-top: 1em;
    }

    .wraper {
        padding: 10px;
    }

    .center {
        text-align: center;
    }
</style>
<body>
<div class="wraper">
    <header>
        <h1 class="center">查询自习室</h1>
    </header>
    <section>
        <a href="#" class="weui_btn weui_btn_primary action_sheet_button" id="jiaoxuelou">所有教学楼</a>
        <div id="actionSheet_wrap_1">
            <div class="weui_mask_transition" id="mask_1"></div>
            <div class="weui_actionsheet" id="actionsheet_1">
                <div class="weui_actionsheet_menu">
                    <div class="weui_actionsheet_cell">所有教学楼</div>
                    <div class="weui_actionsheet_cell">田家炳</div>
                    <div class="weui_actionsheet_cell">文科楼</div>
                    <div class="weui_actionsheet_cell">阶梯教室</div>
                    <div class="weui_actionsheet_cell">东区A楼</div>
                    <div class="weui_actionsheet_cell">东区B楼</div>
                </div>
                <div class="weui_actionsheet_action">
                    <div class="weui_actionsheet_cell" id="actionsheet_cancel_1">取消</div>
                </div>
            </div>
        </div>
        <a href="#" class="weui_btn weui_btn_primary action_sheet_button" id="zhouji">周一</a>
        <div id="actionSheet_wrap_2">
            <div class="weui_mask_transition" id="mask_2"></div>
            <div class="weui_actionsheet" id="actionsheet_2">
                <div class="weui_actionsheet_menu">
                    <div class="weui_actionsheet_cell">周一</div>
                    <div class="weui_actionsheet_cell">周二</div>
                    <div class="weui_actionsheet_cell">周三</div>
                    <div class="weui_actionsheet_cell">周四</div>
                    <div class="weui_actionsheet_cell">周五</div>
                </div>
                <div class="weui_actionsheet_action">
                    <div class="weui_actionsheet_cell" id="actionsheet_cancel_2">取消</div>
                </div>
            </div>
        </div>
        <a href="#" class="weui_btn weui_btn_primary action_sheet_button" id="dijijie">上午第一节</a>
        <div id="actionSheet_wrap_3">
            <div class="weui_mask_transition" id="mask_3"></div>
            <div class="weui_actionsheet" id="actionsheet_3">
                <div class="weui_actionsheet_menu">
                    <div class="weui_actionsheet_cell">上午第一节</div>
                    <div class="weui_actionsheet_cell">上午第二节</div>
                    <div class="weui_actionsheet_cell">下午第一节</div>
                    <div class="weui_actionsheet_cell">下午第二节</div>
                    <div class="weui_actionsheet_cell">晚上第一节</div>
                </div>
                <div class="weui_actionsheet_action">
                    <div class="weui_actionsheet_cell" id="actionsheet_cancel_3">取消</div>
                </div>
            </div>
        </div>
        <!--<div style="overflow: hidden">-->
        <!--<div class="weui_cell weui_cell_switch" style="float: right">-->
        <!--<div class="weui_cell_ft">-->
        <!--<input class="weui_switch" type="checkbox"/>-->
        <!--</div>-->
        <!--</div>-->
        <!--<div class="weui_cells_title" style="float: right">查询当前</div>-->
        <!--</div>-->
    </section>
    <hr style="margin-top: 40px;">
    <article class="weui_article">

    </article>
    <hr>
    <div class="center" style="margin-top: 30px;">
        <img src="assets/images/hsdzzxy_qrcode.jpg" style="width:50%;" alt="关注河师大掌中校园">
        <p>识别此二维码,秒变学霸!</p>
    </div>
    <footer class="center" style="margin-top: 20px;font-size: 0.9em">
        powered by <a href="http://liuhd.github.io" style="color: #2fcc3c">LiuHD</a>
    </footer>
</div>

<script type="text/javascript" src="http://cdn.bootcss.com/jquery/3.0.0/jquery.js"></script>
<!-- <script type="text/javascript" src="../js/jquery.min.js"></script> -->
<script type="text/javascript">
    function init() {
        var date = new Date();
        var xingqiji = date.getDay();
        switch (xingqiji) {
            case 1:
                xingqiji = '周一';
                break;
            case 2:
                xingqiji = '周二';
                break;
            case 3:
                xingqiji = '周三';
                break;
            case 4:
                xingqiji = '周四';
                break;
            case 5:
                xingqiji = '周五';
                break;
            default:
                xingqiji = '周一';
        }
        $("#jiaoxuelou").text('所有教学楼');
        $("#zhouji").text(xingqiji);
        $("#dijijie").text('上午第一节');
        var result = search($('#zhouji').text(), $('#dijijie').text(), $('#jiaoxuelou').text());
        var output = '';
        if (result === undefined) {
            output += '<h1>' + $('#jiaoxuelou').text() + ' ' + $('#zhouji').text() + ' ' + $('#dijijie').text() + '</h1>' +
                    '<section style="padding-left:50px;">' +
                    '<h2 class="title">' + '囧,该教学楼此节课无空闲教室~' + '</h2></section>';
        } else {
            if (result instanceof Array)
                output += '<h1>' + $('#jiaoxuelou').text() + ' ' + $('#zhouji').text() + ' ' + $('#dijijie').text() + '</h1>' +
                        '<section style="padding-left:50px;padding-right: 30px;text-align: left">' +
                        '<h2 class="title">' + result + '</h2></section>';
            else {
                for (var i in result) {
                    output += '<h1>' + jiaoxuelou_translate(i,false) + ' ' + $('#zhouji').text() + ' ' + $('#dijijie').text() + '</h1>' +
                            '<section style="padding-left:50px;padding-right: 30px;text-align: left">' +
                            '<h2 class="title">' + result[i] + '</h2></section>';
                }
            }
        }
        $("article").html(output);
    }
    $(function () {
        $('#jiaoxuelou').click(function () {
            var mask = $('#mask_1');
            var weuiActionsheet = $('#actionsheet_1');
            weuiActionsheet.addClass('weui_actionsheet_toggle');
            mask.show().addClass('weui_fade_toggle').click(function () {
                hideActionSheet(weuiActionsheet, mask);
            });
            $('#actionsheet_cancel_1').click(function () {
                hideActionSheet(weuiActionsheet, mask);
            });
            weuiActionsheet.unbind('transitionend').unbind('webkitTransitionEnd');
            function hideActionSheet(weuiActionsheet, mask) {
                weuiActionsheet.removeClass('weui_actionsheet_toggle');
                mask.removeClass('weui_fade_toggle');
                weuiActionsheet.on('transitionend', function () {
                    mask.hide();
                }).on('webkitTransitionEnd',
                        function () {
                            mask.hide();
                        })
            }
        });

        $('#zhouji').click(function () {
            var mask = $('#mask_2');
            var weuiActionsheet = $('#actionsheet_2');
            weuiActionsheet.addClass('weui_actionsheet_toggle');
            mask.show().addClass('weui_fade_toggle').click(function () {
                hideActionSheet(weuiActionsheet, mask);
            });
            $('#actionsheet_cancel_2').click(function () {
                hideActionSheet(weuiActionsheet, mask);
            });
            weuiActionsheet.unbind('transitionend').unbind('webkitTransitionEnd');
            function hideActionSheet(weuiActionsheet, mask) {
                weuiActionsheet.removeClass('weui_actionsheet_toggle');
                mask.removeClass('weui_fade_toggle');
                weuiActionsheet.on('transitionend', function () {
                    mask.hide();
                }).on('webkitTransitionEnd',
                        function () {
                            mask.hide();
                        })
            }
        });

        $('#dijijie').click(function () {
            var mask = $('#mask_3');
            var weuiActionsheet = $('#actionsheet_3');
            weuiActionsheet.addClass('weui_actionsheet_toggle');
            mask.show().addClass('weui_fade_toggle').click(function () {
                hideActionSheet(weuiActionsheet, mask);
            });
            $('#actionsheet_cancel_3').click(function () {
                hideActionSheet(weuiActionsheet, mask);
            });
            weuiActionsheet.unbind('transitionend').unbind('webkitTransitionEnd');
            function hideActionSheet(weuiActionsheet, mask) {
                weuiActionsheet.removeClass('weui_actionsheet_toggle');
                mask.removeClass('weui_fade_toggle');
                weuiActionsheet.on('transitionend', function () {
                    mask.hide();
                }).on('webkitTransitionEnd',
                        function () {
                            mask.hide();
                        })
            }
        });

        $('.weui_actionsheet_menu .weui_actionsheet_cell').click(function () {
            //此处做处理
            var text = $(this).text();
            var select = $(this).parent().parent().prop('id');
            switch (select) {
                case 'actionsheet_1':
                    $('#jiaoxuelou').text(text);
                    $('#actionsheet_cancel_1').click();
                    break;
                case 'actionsheet_2':
                    $('#zhouji').text(text);
                    $('#actionsheet_cancel_2').click();
                    break;
                case 'actionsheet_3':
                    $('#dijijie').text(text);
                    $('#actionsheet_cancel_3').click();
                    break;
            }
            var result = search($('#zhouji').text(), $('#dijijie').text(), $('#jiaoxuelou').text());
            var output = '';
            if (result === undefined) {
                output += '<h1>' + $('#jiaoxuelou').text() + ' ' + $('#zhouji').text() + ' ' + $('#dijijie').text() + '</h1>' +
                        '<section style="padding-left:50px;">' +
                        '<h2 class="title">' + '囧,该教学楼此节课无空闲教室~' + '</h2></section>';
            } else {
                if (result instanceof Array)
                    output += '<h1>' + $('#jiaoxuelou').text() + ' ' + $('#zhouji').text() + ' ' + $('#dijijie').text() + '</h1>' +
                            '<section style="padding-left:50px;padding-right: 30px;text-align: left">' +
                            '<h2 class="title">' + result + '</h2></section>';
                else {
                    for (var i in result) {
                        output += '<h1>' + jiaoxuelou_translate(i,false) + ' ' + $('#zhouji').text() + ' ' + $('#dijijie').text() + '</h1>' +
                                '<section style="padding-left:50px;padding-right: 30px;text-align: left">' +
                                '<h2 class="title">' + result[i] + '</h2></section>';
                    }
                }
            }
            $("article").html(output);
        });
        init();
    });
    var data = {
        "周一": {
            "上午第一节": {
                "启智楼": [
                    "105",
                    "205",
                    "302",
                    "303"
                ],
                "田家炳楼": [
                    "106",
                    "112",
                    "309",
                    "609"
                ],
                "东教1楼": [
                    "102"
                ]
            },
            "下午第一节": {
                "启智楼": [
                    "105",
                    "201",
                    "202",
                    "209",
                    "301",
                    "307",
                    "402",
                    "406",
                    "407"
                ],
                "文渊楼": [
                    "225",
                    "424"
                ],
                "田家炳楼": [
                    "313",
                    "314",
                    "414",
                    "509"
                ],
                "新五五四楼": [
                    "208"
                ],
                "东教1楼": [
                    "102",
                    "302",
                    "401"
                ],
                "东教2楼": [
                    "102"
                ]
            },
            "下午第二节": {
                "启智楼": [
                    "105",
                    "107",
                    "201",
                    "203",
                    "205",
                    "303",
                    "305",
                    "403",
                    "404"
                ],
                "文渊楼": [
                    "322",
                    "423",
                    "424",
                    "425",
                    "426",
                    "432",
                    "535",
                    "536"
                ],
                "田家炳楼": [
                    "206",
                    "308",
                    "309",
                    "313",
                    "314",
                    "409",
                    "411",
                    "414",
                    "509",
                    "510",
                    "511",
                    "605",
                    "610"
                ],
                "东教1楼": [
                    "402"
                ],
                "东教2楼": [
                    "101"
                ]
            },
            "晚上第一节": {
                "启智楼": [
                    "105",
                    "108",
                    "109",
                    "202",
                    "205",
                    "206",
                    "208",
                    "209",
                    "304",
                    "308",
                    "403",
                    "404",
                    "405",
                    "407",
                    "409"
                ],
                "文渊楼": [
                    "227",
                    "321",
                    "328",
                    "423",
                    "425",
                    "432",
                    "534"
                ],
                "田家炳楼": [
                    "212",
                    "305",
                    "307",
                    "308",
                    "310",
                    "311",
                    "312",
                    "313",
                    "409",
                    "411",
                    "505",
                    "509",
                    "510",
                    "511",
                    "514",
                    "609",
                    "610",
                    "611",
                    "614"
                ],
                "东教1楼": [
                    "103",
                    "301"
                ]
            },
            "上午第二节": {
                "启智楼": [
                    "205",
                    "207",
                    "402",
                    "404"
                ],
                "文渊楼": [
                    "324",
                    "423",
                    "424"
                ],
                "田家炳楼": [
                    "104",
                    "309",
                    "405",
                    "505"
                ],
                "新五五四楼": [
                    "103",
                    "308"
                ],
                "东教2楼": [
                    "102",
                    "201"
                ]
            }
        },
        "周二": {
            "下午第一节": {
                "启智楼": [
                    "101",
                    "104",
                    "105",
                    "408"
                ],
                "文渊楼": [
                    "122",
                    "425",
                    "534",
                    "536"
                ],
                "田家炳楼": [
                    "106",
                    "112",
                    "514"
                ],
                "东教1楼": [
                    "103",
                    "202"
                ]
            },
            "晚上第一节": {
                "启智楼": [
                    "103",
                    "104",
                    "105",
                    "106",
                    "107",
                    "108",
                    "109",
                    "201",
                    "202",
                    "205",
                    "206",
                    "207",
                    "208",
                    "209",
                    "306",
                    "307",
                    "308",
                    "401",
                    "402",
                    "403",
                    "404",
                    "405",
                    "406",
                    "407",
                    "408",
                    "409"
                ],
                "文渊楼": [
                    "227",
                    "322",
                    "328",
                    "426",
                    "432",
                    "542"
                ],
                "田家炳楼": [
                    "106",
                    "107",
                    "112",
                    "305",
                    "309",
                    "310",
                    "311",
                    "313",
                    "314",
                    "406",
                    "409",
                    "505",
                    "509",
                    "511",
                    "605",
                    "609",
                    "610",
                    "611"
                ],
                "东教1楼": [
                    "202",
                    "303",
                    "401"
                ]
            },
            "上午第二节": {
                "启智楼": [
                    "105"
                ],
                "文渊楼": [
                    "419"
                ],
                "田家炳楼": [
                    "202"
                ],
                "东教1楼": [
                    "102",
                    "301"
                ]
            },
            "下午第二节": {
                "启智楼": [
                    "105",
                    "201",
                    "204",
                    "205",
                    "206",
                    "208",
                    "209"
                ],
                "文渊楼": [
                    "227",
                    "322",
                    "328",
                    "418",
                    "424",
                    "425",
                    "534",
                    "542"
                ],
                "田家炳楼": [
                    "112",
                    "308",
                    "314",
                    "405",
                    "409",
                    "411",
                    "414",
                    "505",
                    "609",
                    "610",
                    "611"
                ],
                "新五五四楼": [
                    "103",
                    "308"
                ],
                "东教1楼": [
                    "401"
                ]
            },
            "上午第一节": {
                "启智楼": [
                    "305"
                ],
                "文渊楼": [
                    "321",
                    "324",
                    "424"
                ],
                "田家炳楼": [
                    "310",
                    "314"
                ],
                "新五五四楼": [
                    "302",
                    "303"
                ]
            }
        },
        "周三": {
            "下午第二节": {
                "启智楼": [
                    "104",
                    "105",
                    "107",
                    "201",
                    "202",
                    "203",
                    "204",
                    "209",
                    "405",
                    "406"
                ],
                "文渊楼": [
                    "225",
                    "323",
                    "328",
                    "419",
                    "423",
                    "535"
                ],
                "田家炳楼": [
                    "112",
                    "208",
                    "309",
                    "405",
                    "406",
                    "414",
                    "509",
                    "514",
                    "605",
                    "609",
                    "611",
                    "614"
                ],
                "新五五四楼": [
                    "301"
                ]
            },
            "上午第一节": {
                "启智楼": [
                    "105",
                    "107",
                    "109",
                    "204",
                    "207",
                    "308"
                ],
                "文渊楼": [
                    "122",
                    "534"
                ],
                "田家炳楼": [
                    "309",
                    "402",
                    "505",
                    "614"
                ],
                "新五五四楼": [
                    "308",
                    "401"
                ]
            },
            "下午第一节": {
                "启智楼": [
                    "105",
                    "206",
                    "207"
                ],
                "文渊楼": [
                    "328"
                ],
                "田家炳楼": [
                    "305",
                    "308"
                ]
            },
            "晚上第一节": {
                "启智楼": [
                    "105",
                    "108",
                    "201",
                    "207",
                    "208",
                    "404"
                ],
                "文渊楼": [
                    "227",
                    "322",
                    "323",
                    "328",
                    "419",
                    "424",
                    "425",
                    "426",
                    "432"
                ],
                "田家炳楼": [
                    "106",
                    "113",
                    "309",
                    "313",
                    "314",
                    "409",
                    "411",
                    "510",
                    "511",
                    "514",
                    "605",
                    "610",
                    "611"
                ],
                "东教1楼": [
                    "102",
                    "201",
                    "401"
                ]
            },
            "上午第二节": {
                "启智楼": [
                    "403"
                ],
                "文渊楼": [
                    "324",
                    "534"
                ],
                "田家炳楼": [
                    "208",
                    "405"
                ],
                "东教2楼": [
                    "201"
                ]
            }
        },
        "周四": {
            "晚上第一节": {
                "启智楼": [
                    "101",
                    "102",
                    "103",
                    "104",
                    "105",
                    "106",
                    "107",
                    "201",
                    "202",
                    "204",
                    "301",
                    "302",
                    "304",
                    "307",
                    "401",
                    "402",
                    "403",
                    "404",
                    "405",
                    "406",
                    "407",
                    "408"
                ],
                "文渊楼": [
                    "321",
                    "322",
                    "324",
                    "328",
                    "423",
                    "424",
                    "425",
                    "426",
                    "432",
                    "534",
                    "535",
                    "536",
                    "542"
                ],
                "田家炳楼": [
                    "104",
                    "106",
                    "107",
                    "112",
                    "206",
                    "208",
                    "212",
                    "305",
                    "306",
                    "307",
                    "308",
                    "310",
                    "311",
                    "313",
                    "405",
                    "406",
                    "409",
                    "411",
                    "414",
                    "505",
                    "509",
                    "510",
                    "511",
                    "514",
                    "605",
                    "609",
                    "610",
                    "611",
                    "614"
                ],
                "东教1楼": [
                    "101",
                    "102",
                    "103",
                    "201",
                    "301",
                    "401",
                    "402"
                ]
            },
            "下午第二节": {
                "启智楼": [
                    "104",
                    "105",
                    "106",
                    "108",
                    "109",
                    "203",
                    "205",
                    "304",
                    "306",
                    "406",
                    "408"
                ],
                "文渊楼": [
                    "122",
                    "324",
                    "425",
                    "426",
                    "535"
                ],
                "田家炳楼": [
                    "108",
                    "212",
                    "306",
                    "309",
                    "311",
                    "313",
                    "314",
                    "405",
                    "406",
                    "414",
                    "514",
                    "605",
                    "614"
                ],
                "新五五四楼": [
                    "203",
                    "308"
                ],
                "东教1楼": [
                    "402"
                ]
            },
            "上午第一节": {
                "启智楼": [
                    "105",
                    "304",
                    "306"
                ],
                "文渊楼": [
                    "323",
                    "423"
                ],
                "田家炳楼": [
                    "104",
                    "405"
                ]
            },
            "下午第一节": {
                "启智楼": [
                    "105",
                    "209",
                    "304",
                    "306"
                ],
                "文渊楼": [
                    "426"
                ],
                "新五五四楼": [
                    "203"
                ]
            },
            "上午第二节": {
                "启智楼": [
                    "304",
                    "305",
                    "306"
                ],
                "文渊楼": [
                    "424",
                    "534"
                ],
                "田家炳楼": [
                    "306",
                    "510"
                ],
                "新五五四楼": [
                    "202"
                ],
                "东教1楼": [
                    "202"
                ]
            }
        },
        "周五": {
            "上午第二节": {
                "启智楼": [
                    "101",
                    "105",
                    "106",
                    "205",
                    "208",
                    "209",
                    "301",
                    "309",
                    "407"
                ],
                "文渊楼": [
                    "328",
                    "432",
                    "534",
                    "536"
                ],
                "田家炳楼": [
                    "208",
                    "306",
                    "307",
                    "406",
                    "414"
                ],
                "新五五四楼": [
                    "103",
                    "401"
                ],
                "东教1楼": [
                    "402"
                ]
            },
            "下午第二节": {
                "启智楼": [
                    "101",
                    "103",
                    "105",
                    "106",
                    "201",
                    "202",
                    "203",
                    "205",
                    "206",
                    "207",
                    "208",
                    "209",
                    "302",
                    "401",
                    "402",
                    "403",
                    "405",
                    "407",
                    "408",
                    "409"
                ],
                "文渊楼": [
                    "225",
                    "321",
                    "322",
                    "323",
                    "324",
                    "328",
                    "419",
                    "423",
                    "426",
                    "534",
                    "535"
                ],
                "田家炳楼": [
                    "106",
                    "206",
                    "208",
                    "305",
                    "308",
                    "309",
                    "310",
                    "313",
                    "314",
                    "402",
                    "405",
                    "406",
                    "409",
                    "411",
                    "414",
                    "502",
                    "505",
                    "509",
                    "510",
                    "511",
                    "514",
                    "605",
                    "609",
                    "610",
                    "611",
                    "614"
                ],
                "东教1楼": [
                    "103",
                    "202",
                    "301",
                    "303"
                ]
            },
            "晚上第一节": {
                "启智楼": [
                    "101",
                    "102",
                    "103",
                    "104",
                    "105",
                    "106",
                    "107",
                    "201",
                    "202",
                    "205",
                    "301",
                    "302",
                    "304",
                    "305",
                    "307",
                    "308",
                    "401",
                    "402",
                    "403",
                    "405",
                    "406",
                    "407",
                    "408"
                ],
                "文渊楼": [
                    "227",
                    "321",
                    "322",
                    "323",
                    "324",
                    "328",
                    "423",
                    "424",
                    "425",
                    "426",
                    "432",
                    "534",
                    "535",
                    "536",
                    "542"
                ],
                "田家炳楼": [
                    "106",
                    "107",
                    "108",
                    "112",
                    "206",
                    "208",
                    "212",
                    "305",
                    "306",
                    "307",
                    "308",
                    "310",
                    "311",
                    "312",
                    "313",
                    "402",
                    "405",
                    "406",
                    "409",
                    "411",
                    "414",
                    "505",
                    "509",
                    "510",
                    "511",
                    "514",
                    "605",
                    "609",
                    "610",
                    "611",
                    "614"
                ],
                "东教1楼": [
                    "101",
                    "102",
                    "103",
                    "201",
                    "202",
                    "301",
                    "302"
                ],
                "东教2楼": [
                    "101",
                    "102",
                    "202"
                ]
            },
            "下午第一节": {
                "启智楼": [
                    "102",
                    "103",
                    "105",
                    "106",
                    "201",
                    "202",
                    "204",
                    "205",
                    "206",
                    "207",
                    "208",
                    "209",
                    "404",
                    "406"
                ],
                "文渊楼": [
                    "425",
                    "534",
                    "542"
                ],
                "田家炳楼": [
                    "108",
                    "206",
                    "208",
                    "212",
                    "302",
                    "306",
                    "308",
                    "309",
                    "312",
                    "313",
                    "314",
                    "406",
                    "411",
                    "414",
                    "510",
                    "609"
                ]
            },
            "上午第一节": {
                "启智楼": [
                    "105"
                ],
                "田家炳楼": [
                    "106",
                    "112",
                    "402"
                ],
                "新五五四楼": [
                    "103",
                    "308"
                ],
                "东教1楼": [
                    "102",
                    "103",
                    "402"
                ],
                "东教2楼": [
                    "201"
                ]
            }
        }
    };

    function jiaoxuelou_translate(jiaoxuelou, flag) {
        if (flag) {
            switch (jiaoxuelou) {
                case '二号楼':
                    return '启智楼';
                case '文渊楼':
                    return '文科楼';
                case '田家炳':
                    return '田家炳楼';
                case '阶梯教室':
                    return '新五五四楼';
                case '东区A楼':
                    return '东教1楼';
                case '东区B楼':
                    return '东教2楼';
            }
        } else {
            switch (jiaoxuelou) {
                case '启智楼':
                    return '二号楼';
                case '文渊楼':
                    return '文科楼';
                case '田家炳楼':
                    return '田家炳';
                case '新五五四楼':
                    return '阶梯教室';
                case '东教1楼':
                    return '东区A楼';
                case '东教2楼':
                    return '东区B楼';
            }
        }
    }

    function search(zhouji, dijijie, jiaoxuelou) {
        if (jiaoxuelou != '所有教学楼') {
            jiaoxuelou = jiaoxuelou_translate(jiaoxuelou, true);
            return data[zhouji][dijijie][jiaoxuelou];
        }
        else {
            return data[zhouji][dijijie];
        }
    }


</script>
</body>
</html>
