// ==UserScript==
// @name                115RenamePlus_WBZD
// @namespace           https://github.com/LSD08KM/115RenamePlus
// @version             0.1.0 init new one
// @description         115RenamePlus(根据现有的文件名<番号>查询并修改文件名)
// @author              db117, FAN0926, LSD08KM, WBZD
// @include             https://115.com/*
// @domain              javbus.com
// @grant               GM_notification
// @grant               GM_xmlhttpRequest
// ==/UserScript==
// :set expandtab ts=4 sw=4 ai
// :%retab

/*
 * @param suffix            后缀，就是扩展名
 */
(function () {
    // 按钮
    let rename_list = `
            <li id="rename_list">
                <a id="rename_actor_title_en" class="mark" href="javascript:;"><i class="icon-operate ifo-linktask"></i><span>rename_actor_title_en</span></a>
                <a id="rename_actor_title_jp" class="mark" href="javascript:;"><i class="icon-operate ifo-linktask"></i><span>rename_actor_title_jp</span></a>
                <!-- 处理视频分段，转成_P1格式-->
                <a id="video_part_format" class="mark" href="javascript:;"><i class="icon-operate ifo-tag"></i><span>格式化视频分段</span></a>
            </li>
        `;
    /**
     * 添加按钮的定时任务
     */
    let interval = setInterval(buttonInterval, 1000);

    // javbus
    let javbusBase = "https://www.javbus.com/";
    let javbusBaseEn = "https://www.javbus.com/en/";
    // 有码
    let javbusSearch = javbusBase + "search/";
    // 无码
    let javbusUncensoredSearch = javbusBase + "uncensored/search/";

    'use strict';

    /**
     * 添加按钮定时任务(检测到可以添加时添加按钮)
     */
    function buttonInterval() {
        let open_dir = $("div#js_float_content li[val='open_dir']");
        if (open_dir.length !== 0 && $("li#rename_list").length === 0) {
            open_dir.before(rename_list);
            $("a#rename_actor_title_en").click(
                function () {
                    rename(renameJavbusDetail, "javbus", "video", false, "en");
                });
            $("a#rename_actor_title_jp").click(
                function () {
                    rename(renameJavbusDetail, "javbus", "video", false, "jp");
                });
            $("a#video_part_format").click(
                function () {
                    videoPartFormat();
                });
            console.log("添加按钮");
            // 结束定时任务
            clearInterval(interval);
        }
    }

    /**
     * 执行改名方法
     * @param call       回调函数
     * @param site       网站
     * @param rntype     改名类型 video picture
     * @param ifAddDate  是否添加时间
     * @param lang       标题语言
     */
    function rename(call, site, rntype, ifAddDate, lang) {
        // 获取所有已选择的文件
        let list = $("iframe[rel='wangpan']")
            .contents()
            .find("li.selected")
            .each(function (index, v) {
                let $item = $(v);
                // 原文件名称
                let file_name = $item.attr("title");
                // 文件类型
                let file_type = $item.attr("file_type");

                // 文件id
                let fid;
                // 后缀名
                let suffix;
                if (file_type === "0") {
                    // 文件夹
                    fid = $item.attr("cate_id");
                } else {
                    // 文件
                    fid = $item.attr("file_id");
                    // 处理后缀
                    let lastIndexOf = file_name.lastIndexOf('.');
                    if (lastIndexOf !== -1) {
                        suffix = file_name.substring(lastIndexOf, file_name.length);
                        file_name = file_name.substring(0, lastIndexOf);
                    }
                }
                if (fid && file_name) {
                    let VideoCode;
                    // 正则匹配番号
                    if (site == "mgstage"){
                        VideoCode = getVideoCode(file_name,"mgstage");
                    }else if (site == "fc2"){
                        VideoCode = getVideoCode(file_name,"fc2");
                    }else{
                        VideoCode = getVideoCode(file_name);
                    }
                    console.log("正则匹配番号:" + VideoCode.fh);
                    if (VideoCode.fh) {
                        if ( rntype=="video" ){
                            // 校验是否是中文字幕
                            let ifChineseCaptions = checkifChineseCaptions(VideoCode.fh, file_name);
                            // 执行查询
                            console.log("开始查询");
                            call(fid, rntype, VideoCode.fh, suffix, VideoCode.if4k, ifChineseCaptions, VideoCode.part, ifAddDate, lang);
                        } else if ( rntype=="picture" ){
                            // 是图片时，向part传图片名冗余，不要中字判断，只在页面获取编号
                            // 图片名冗余
                            let picCaptions = getPicCaptions(VideoCode.fh, file_name);
                            let ifChineseCaptions;
                            // 执行查询
                            console.log("开始查询");
                            call(fid, rntype, VideoCode.fh, suffix, VideoCode.if4k, ifChineseCaptions, picCaptions, ifAddDate, lang);
                        }

                    }
                }
            });
        // if(!Main.ReInstance({type:'', star:'', is_q: '', is_share:''})){window.location.reload();}
        // if(list){window.location.reload();}
    }

    /**
     * 通过javbus详情页进行查询
     * 请求javbus,并请求115进行改名
     * @param fid               文件id
     * @param rntype            改名类型 video picture
     * @param fh                番号
     * @param suffix            后缀
     * @param ifChineseCaptions 是否有中文字幕
     * @param part              视频分段，图片冗余文件名
     * @param ifAddDate         是否添加时间
     * @param searchUrl         请求地址
     * @param lang              标题语言
     */
    function renameJavbusDetail(fid, rntype, fh, suffix, if4k, ifChineseCaptions, part, ifAddDate, lang) {
        requestJavbusDetail(fid, rntype, fh, suffix, if4k, ifChineseCaptions, part, ifAddDate, javbusSearch, lang);
    }
    function requestJavbusDetail(fid, rntype, fh, suffix, if4k, ifChineseCaptions, part, ifAddDate, searchUrl, lang) {
        let title;
        let date;
        let moviePage = javbusBase + fh;
        let enPage = javbusBaseEn + fh;
        let actors = [];

        // 获取javbus详情页内信息
        let getJavbusDetail = new Promise(async (resolve, reject) => {
            console.log("处理详情页：" + moviePage);
            if ( rntype=="picture" ){
                resolve();
            } else if ( rntype=="video" ) {
                if ( lang=="en" ) {
                    await getActorTitle(moviePage);
                    // cover the title to English title, which has removed actor info
                    await getEnTitle(enPage);
                    console.log('final 演员：'+actors+' '+'标题：'+title);
                } else {
                    // lang == jp
                    await getActorTitle(moviePage);
                    // The Jp title already has actors name, remove actor info
                    actors = [];
                    console.log('final 标题：'+title);
                }
                resolve();
            }else{
                resolve();
            }
        });

        function getEnTitle(url) {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: "GET",
                    url: url,
                    onload: xhr => {
                        let response = $(xhr.responseText);
                        // 标题
                        title = response
                            .find("h3")
                            .html();
                        title = title.slice(fh.length+1);
                        // remove actors' english names
                        title = title.split(':')[0].trim()
                        // 时间
                        date = response
                                .find("p:nth-of-type(2)")
                                .html();
                        date = date.match(/\d{4}\-\d{2}\-\d{2}/);
                        console.log('标题：'+title);
                        resolve();
                    }
                });
            });
        }

        function getActorTitle(url) {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: "GET",
                    url: url,
                    onload: xhr => {
                        let response = $(xhr.responseText);
                        // 标题
                        title = response
                            .find("h3")
                            .html();
                        title = title.slice(fh.length+1);
                        // 演员们
                        let actorTags = response.find("div.star-name").each(function(){
                            actors.push($(this).find("a").attr("title"));
                        });
                        console.log('演员：'+actors);
                        resolve();
                    }
                });
            });
        }

        function setName(){
            return new Promise((resolve, reject) => {
                if(moviePage){
                    let actor = actors.toString();
                    // 构建新名称
                    let newName = buildNewName(fh, rntype, suffix, if4k, ifChineseCaptions, part, title, date, actor, ifAddDate);
                    if (newName) {
                        // 修改名称
                        send_115(fid, newName, fh);
                        console.log("新名: "+newName);
                    }
                    resolve(newName);
                }else if (searchUrl !== javbusUncensoredSearch) {
                    console.log("查询无码 " + searchUrl);
                    // 进行无码重查询
                    requestJavbus(fid, fh, suffix, if4k, ifChineseCaptions, part, ifAddDate, javbusUncensoredSearch);
                }else {
                    resolve("没有查到结果");
                }
            });
        }
        getJavbusDetail.then(setName,setName)
            .then(function(result){
                console.log("改名结束，" + result);
            });
    }

    /**
     * 图片名冗余
     * @param fh    番号
     * @param title 标题
     */
    function getPicCaptions(fh, title) {
        let regExp = new RegExp(fh + "[_-]?[A-Z]{1,5}");
        let match = title.toUpperCase().match(regExp);
        if (match) {
            let houzhui = title.slice( fh.length , title.length )
            console.log("找到后缀" + houzhui);
            return houzhui;
        }
    }

    /**
     * 校验是否为中文字幕
     * @param fh    番号
     * @param title 标题
     */
    function checkifChineseCaptions(fh, title) {
        if (title.indexOf("中文字幕") !== -1) {
            return true;
        }
        let regExp = new RegExp(fh + "[_-]?C");
        let regExp2 = new RegExp(fh + "[_-]?CD");
        let match = title.toUpperCase().match(regExp);
        let match2 = title.toUpperCase().match(regExp2);
        if (match) {
            if (match2) {} else {
                return true;
            }
        }
    }

    /**
     * 构建新名称：番号 中文字幕 日期 标题  文件名不超过255
     * @param fh                番号
     * @param rntype            改名类型 video picture
     * @param suffix            后缀，扩展名
     * @param ifChineseCaptions 是否有中文字幕
     * @param part              视频分段，图片冗余文件名
     * @param title             番号标题
     * @param date              日期
     * @param actor             演员
     * @param ifAddDate         是否加日期
     * @returns {string}        新名称
     */
    function buildNewName(fh, rntype, suffix, if4k, ifChineseCaptions, part, title, date, actor, ifAddDate) {
        if ( rntype=="video" ){
            if (title) {
                let newName = String(fh);
                // 是4k
                if (if4k) {
                    newName = newName + if4k;
                }
                // 有中文字幕
                if (ifChineseCaptions) {
                    newName = newName + "-C";
                }
                if (part){
                    newName = newName + "_P" +  part;
                }
                // 拼接标题 判断长度
                if (title) {
                    newName = newName + " " + title;
                    if ( newName.length > 100 ){
                        newName = newName.substring(0, 100);
                        newName += "...";
                    }
                }
                // 有演员
                if (actor) {
                    newName = newName + " : " + actor;
                }
                // 有时间
                if (ifAddDate && date) {
                    newName = newName + " " + date;
                }
                if (suffix) {
                    // 文件保存后缀名
                    newName = newName + suffix;
                }
                return newName;
            }
        } else if ( rntype=="picture" ){
            if (fh){
                let newName = String(fh);
                if (part){
                    newName = newName  +  part;
                }
                if (suffix) {
                    // 文件保存后缀名
                    newName = newName + suffix;
                }
                return newName;
            }
        }
    }

    /**
     * 115名称不接受(\/*?\"<>|)
     * @param name
     */
    function stringStandard(name) {
        return name.replace(/\\/g, "")
            .replace(/\//g, " ")
            .replace(/\?/g, " ")
            .replace(/"/g, " ")
            .replace(/</g, " ")
            .replace(/>/g, " ")
            .replace(/\|/g, "")
            .replace(/\*/g, " ");
    }

    /**
     * 请求115接口改名
     * @param id 文件id
     * @param name 要修改的名称
     * @param fh 番号
     */
    function send_115(id, name, fh) {
        let file_name = stringStandard(name);
        $.post("https://webapi.115.com/files/edit", {
                fid: id,
                file_name: file_name
            },
            function (data, status) {
                let result = JSON.parse(data);
                if (!result.state) {
                    GM_notification(getDetails(fh, "修改失败"));
                    console.log("请求115接口异常: " + unescape(result.error
                        .replace(/\\(u[0-9a-fA-F]{4})/gm, '%$1')));
                } else {
                    GM_notification(getDetails(fh, "修改成功"));
                    console.log("修改文件名称,fh:" + fh, "name:" + file_name);
                }
            }
        );
    }

    /**
     * 通知参数
     * @param text 内容
     * @param title 标题
     * @returns {{text: *, title: *, timeout: number}}
     */
    function getDetails(text, title) {
        return {
            text: text,
            title: title,
            timeout: 1000
        };
    }

    /**
     * 获取番号
     * @param title         源标题
     * @param type          番号类型 mgstage fc2
     * @returns {string}    提取的番号
     */
    function getVideoCode(title, type="nomal") {
        title = title.toUpperCase();
        console.log("传入title: " + title);
        // 判断是否多集
        let part;  //FHD1 hhb1
        if (!part) {
            part = title.match(/CD\d{1,2}/);
        }if (!part) {
            part = title.match(/HD\d{1,2}/);
        }if (!part) {
            part = title.match(/FHD\d{1,2}/);
        }if (!part) {
            part = title.match(/HHB\d{1,2}/);
        }if (!part) {
            part = title.match(/(_P){1}\d{1,2}/);
        }
        if (part){
            part = part.toString().match(/\d+/).toString();
            console.log("识别多集:" + part);
        }

        let if4k;
        if (!if4k) {
            if4k = title.match(/(-4K){1}/);
            if(if4k){ if4k = "-4k";}
        } if (!if4k) {
            if4k = title.match(/(VP9版){1}/);
            if(if4k){ if4k = "-4kVP9版";}
        } if (!if4k) {
            if4k = title.match(/(H264版){1}/);
            if(if4k){ if4k = "-4kH264版";}
        }

        title = title.replace("SIS001", "")
            .replace("1080P", "")
            .replace("720P", "")
            .replace("[JAV] [UNCENSORED]","")
            .replace("[THZU.CC]","")
            .replace("[22SHT.ME]","")
            .replace("[7SHT.ME]","")
            .replace("BIG2048.COM","")
            .replace("FUN2048.COM@","")
            .replace(".HHB","分段")
            .replace(".FHD","分段")
            .replace(".HD","分段");
        console.log("修正后的title: " + title);

        let t = '';
        if (type=="mgstage"){
            console.log("分析mgstage编号");
            t = title.match(/\d{3,4}[A-Z]{3,4}[\-_]?\d{3,4}/)
            if (!t) {  // シロウトTV @SIRO-3585
                t = title.match(/[A-Z]{2,5}[\-_]{1}\d{3,5}/);
            }
        }else if (type=="fc2"){
            console.log("分析fc2编号");
            t = title.match(/(FC2){0,1}[\-_ ]{0,1}(PPV){0,1}[\-_ ]{0,1}(\d{5,8})/);
            if(t){
                console.log("找到番号:" + t[0]);
                console.log("查找番号:" + t[3]);
                t = t[1];
            }
        }else {
            t = title.match(/T28[\-_]\d{3,4}/);
            // 一本道
            if (!t) {
                t = title.match(/1PONDO[\-_ ]\d{6}[\-_]\d{2,4}/);
                if (t) {
                    t = t.toString().replace("1PONDO_", "")
                        .replace("1PONDO-", "");
                }
            }if (!t) {
                //10MUSUME
                t = title.match(/10MUSUME[\-_]\d{6}[\-_]\d{2,4}/);
                if (t) {
                    t = t.toString().replace("10MUSUME", "")
                        .replace("10MUSUME-", "");
                }
            }
            if (!t) {
                t = title.match(/HEYZO[\-_]{0,1}\d{4}/);
            }
            if (!t) {
                // 加勒比
                t = title.match(/CARIB[\-_ ]\d{6}[\-_]\d{3}/);
                if (t) {
                    t = t.toString().replace("CARIB-", "")
                        .replace("CARIB_", "");
                }
            }if (!t) {
                // 加勒比
                t = title.match(/CARIBBEAN[\-_ ]\d{6}[\-_]\d{3}/);
                if (t) {
                    t = t.toString().replace("CARIBBEAN-", "")
                        .replace("CARIBBEAN", "");
                }
            }
            if (!t) {
                // 东京热
                t = title.match(/N[-_]\d{4}/);
            }
            if (!t) {
                // Jukujo-Club | 熟女俱乐部
                t = title.match(/JUKUJO[\-_]\d{4}/);
            }

            // 通用
            if (!t) {
                t = title.match(/[A-Z]{2,5}[\-_]{0,1}\d{3,5}/);
            }
            if (!t) {
                t = title.match(/\d{6}[\-_]\d{2,4}/);
            }
            if (!t) {
                t = title.match(/[A-Z]+\d{3,5}/);
            }
            if (!t) {
                t = title.match(/[A-Za-z]+[\-_]{0,1}\d+/);
            }
            if (!t) {
                t = title.match(/\d+[\-_]{0,1}\d+/);
            }
        }

        if (!t) {
            console.log("没找到番号:" + title);
            return false;
        }
        if (t) {
            t = t.toString().replace("_", "-");
            console.log("找到番号:" + t);
            return{
                fh: t,
                part: part,
                if4k: if4k,
            };
        }
    }

    /**
     * 处理视频分段，转成_P1格式-->
     */
    function videoPartFormat(){
        let list = $("iframe[rel='wangpan']")
            .contents()
            .find("li.selected")
            .each(function (index, v) {
                let $item = $(v);
                // 原文件名称
                let file_name = $item.attr("title");
                // 文件类型
                let file_type = $item.attr("file_type");
                // 文件id
                let fid;
                // 扩展名
                let suffix;
                if (file_type === "0") {
                    // 文件夹
                    fid = $item.attr("cate_id");
                } else {
                    // 文件
                    fid = $item.attr("file_id");
                    // 处理后缀
                    let lastIndexOf = file_name.lastIndexOf('.');
                    if (lastIndexOf !== -1) {
                        suffix = file_name.substring(lastIndexOf, file_name.length);
                        file_name = file_name.substring(0, lastIndexOf);
                    }
                }
                if (fid && file_name) {
                    let file_name_upper = file_name.toUpperCase();
                    console.log("处理文件名: " + file_name_upper);
                    // 判断是否多集
                    let part;  //FHD1 hhb1
                    let regexp;
                    if (!part) {
                        regexp = /CD\d{1,2}/;
                        part = file_name_upper.match(regexp);
                    }if (!part) {
                        regexp = /HD\d{1,2}/;
                        part = file_name_upper.match(regexp);
                    }if (!part) {
                        regexp = /FHD\d{1,2}/;
                        part = file_name_upper.match(regexp);
                    }if (!part) {
                        regexp = /HHB\d{1,2}/;
                        part = file_name_upper.match(regexp);
                    }if (!part) {
                        regexp = /(_P){1}\d{1,2}/;
                        part = file_name_upper.match(regexp);
                    }
                    if (part){
                        part = part.toString().match(/\d+/).toString();
                    }
                    if (!part) {
                        regexp = /(-){1}[A-Z]{1}/;
                        part = file_name_upper.match(regexp);
                        if (part){
                            part = part.toString().charCodeAt(1)-64;
                        }
                    }

                    if (part){
                        console.log("识别多集:" + part);
                        let newName = file_name_upper.replace(regexp, "_P"+part);
                        console.log("新文件名" + newName);
                        let iname = file_name_upper.slice(0, file_name_upper.search(regexp));
                        send_115(fid, newName, iname);
                    }
                }
            });
    }

})();
