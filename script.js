/* アプリのレシピ帳 */
(function(){
"use strict";

/* ===== 保存 ===== */
var store=(function(){
  var has=(typeof window.storage!=="undefined")&&window.storage;
  return{
    get:async function(k){try{
      if(has){var r=await window.storage.get(k,false);return r?JSON.parse(r.value):null;}
      var v=localStorage.getItem(k);return v?JSON.parse(v):null;}catch(e){return null;}},
    set:async function(k,v){try{
      if(has){await window.storage.set(k,JSON.stringify(v),false);return true;}
      localStorage.setItem(k,JSON.stringify(v));return true;}catch(e){toast("保存できませんでした");return false;}}
  };
})();
var KEY_IDEAS="recipebook:ideas",KEY_STEPS="recipebook:steps",KEY_TAGS="recipebook:tags";
var ideas=[],checks={},tags=[],editingId=null,tagEdit=false;

var HAT='<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
+'<path d="M8 17.5c-2.6 0-4.6-2-4.6-4.5S5.4 8.5 8 8.5c.3-2.6 2.6-4.5 5.3-4.5 1.6 0 3 .7 3.9 1.8.8-.6 1.8-1 2.9-1 2.5 0 4.5 1.9 4.6 4.3 2.4.3 4 2.2 4 4.4 0 2.5-2 4.5-4.6 4.5"/>'
+'<path d="M8 17.5h16v6.6c0 .8-.7 1.4-1.5 1.4h-13c-.8 0-1.5-.6-1.5-1.4v-6.6z"/></svg>';
var TICK='<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.2 3.2L13 5"/></svg>';
function stampHTML(sm){return '<span class="stamp'+(sm?" sm":"")+'">'+HAT+'<b>COOKED!</b><span class="yr">HOMEMADE</span></span>';}

var PALETTE=["#7E9C6B","#5B7B90","#C08E3C","#B4707F","#8A7CA8","#C05A44","#6E9B93","#93876B"];
var FUNCS=["記録する","一覧で見る","チェックリスト","検索する","タグで分ける","計算・集計","カレンダー","タイマー","写真を保存","印刷する","コピーする","並べ替え","グラフ","リマインド"];
var LOOKS=["シンプル","北欧風","iPhone純正風","レシピ本風","手帳風","清潔感","クリニック","教育","かわいい","落ち着いた和風"];
var CARES=["直感的に押せる","情報を絞る","項目の親子関係を明確に","どこに飛ぶか明示","文字を大きく","色の刺激は控えめ","誤操作を取り消せる"];

var COMMON="【前提】\n"
+"GitHub Pagesで公開し、iPhoneのホーム画面へ追加してアプリのように使用するWebアプリとして作成してください。\n\n"
+"【ファイル構成】\n・完全フラット構成にしてください\n・サブフォルダを作らないでください\n・css、js、icons、imagesフォルダを作らないでください\n・すべて同じ階層に配置してください\n・相対パスを使用してください\n\n"
+"【PWA対応】\n・manifest.jsonを作成してください\n・Service Workerを作成してください\n・apple-touch-iconを用意してください\n・必要なPWAアイコンを用意してください\n\n"
+"【受け渡し】\n・完成ファイルは必ずZIPにまとめてください\n・ZIPを展開すると全ファイルが直下に並ぶようにしてください\n・GitHubへアップロードするファイル一覧を提示してください\n\n"
+"【安全性】\n・APIキーを使用しない\n・ログイン機能を使用しない\n・サーバーサイド処理を使用しない\n・機密情報を含めない\n\n"
+"【自己チェック】\n・ファイル参照エラーがない\n・アイコン参照エラーがない\n・GitHub Pagesで動作する\n・ZIP展開後にフラット構成になっている";

var HEAD="あなたはClaudeのプロンプトエンジニアです。\n"
+"これから私がClaude向けのプロンプトを提示します。\n"
+"対象モデルは以下の中から最も適切なモデルを1つ選んでください。【sonnet5 / opus5 / haiku4.5 / fable5】\n"
+"あなたの役割は、指定されたClaudeモデルの特性を考慮し、そのモデルで最高品質の出力が得られるようにプロンプトを最適化することです。\n\n"
+"以下の手順で回答してください。\n\n"
+"1. 現在のプロンプトの問題点を簡潔に分析\n"
+"2. 指定モデル向けに最適化した改善版プロンプトを作成\n"
+"3. なぜその修正が有効なのかを簡潔に説明\n"
+"4. 必要に応じて、Claudeがより高精度に動作するための追加指示も提案\n\n"
+"【元のプロンプト】";

var FINAL_PROMPT="ここまでの試作品を、完成版として仕上げてください。\n\n"
+"・HTML / CSS / JavaScript をまとめた完成版にしてください\n"
+"・完全フラット構成（サブフォルダなし・相対パス）にしてください\n"
+"・manifest.json と Service Worker、apple-touch-icon、icon-192.png、icon-512.png を用意してください\n"
+"・APIキー、ログイン機能、サーバーサイド処理は使わないでください\n"
+"・最後に、完成ファイル一式をZIPにまとめてください\n"
+"・ZIPを展開したとき、全ファイルが直下に並ぶようにしてください\n"
+"・GitHubへアップロードするファイル一覧も提示してください";

var STEPS=[
 {t:"ChatGPTで設計を整える",c:"var(--gpt)",items:[
   {x:"アイデアメモで作ったプロンプトをChatGPTに貼りつけ、改善版を受け取る"}]},

 {t:"Claudeで試作品をつくる",c:"var(--claude)",items:[
   {x:"プロンプトをClaudeに貼りつけ、出力されたプレビューをチェックして修正する"}]},

 {t:"完成版を作ってもらう",c:"var(--claude)",items:[
   {x:"プロンプトをClaudeに貼って、完成版をゲット"}],final:true},

 {t:"ZIPファイルで受け取る",c:"var(--claude)",items:[
   {x:"ClaudeからZIPをダウンロード（以下のようになっていればOK）"}],
  note:{t:"正しいZIPの中身",b:"<pre>app.zip\n ├ index.html\n ├ manifest.json\n ├ sw.js\n ├ style.css\n ├ script.js\n ├ icon-192.png\n └ icon-512.png</pre>"
   +'<p style="margin:8px 0 0">フォルダの中にさらにフォルダが入っていると、ページが表示されないので注意。</p>'}},

 {t:"GitHubでリポジトリを作る",c:"var(--gh)",items:[
   {x:'GitHubにログインして、自分のアイコンをタップし、右上の <span class="en">＋</span> を押す'},
   {x:'<span class="en">New repository</span> を押す'},
   {x:'<span class="en">Repository name</span> にアプリの名前を入力する'},
   {x:'<span class="en">Description</span> は空欄のままでOK',w:"説明したいことがあればここに書く。"},
   {x:'<span class="en">Choose visibility</span> は <span class="en">Public</span> を選ぶ',w:"リンクで共有できるようになる。"},
   {x:'<span class="en">Add a README file</span> にチェックを入れる',w:"箱に最初の1枚を入れておくイメージ。"},
   {x:'右下にある、緑の <span class="en">Create repository</span> ボタンを押す',w:"Add .gitignore と Add license はNOのままでOK。"}]},

 {t:"ファイルをアップロードして保存する",c:"var(--gh)",items:[
   {x:'右上の「・・・」の四角をタップ →「＋ upload file」をタップ →「choose your file」をタップする'},
   {x:"ファイルアプリでzipを解凍し、ダウンロードしたフォルダ内すべてのファイルをアップロードする"},
   {x:"ファイル名に「(1)」が付いていたら消す"},
   {x:'<span class="en">Commit directly to the main branch</span> を選択'},
   {x:'<span class="en">Commit changes</span> を押す',w:"これで保存完了"}]},

 {t:"公開して、ホーム画面に置く",c:"var(--gh)",items:[
   {x:'右上の「more ▼」→ <span class="en">Settings</span> を押し、<span class="en">General</span> のページで英語の <span class="en">Repository name</span> を入力する →<span class="en">Rename</span> ボタンで保存'},
   {x:'<span class="en">Pages</span> を押す',w:"サイトとして公開する設定画面"},
   {x:'Source で <span class="en">Deploy from a branch</span> を選ぶ',w:"保存したファイルをそのまま公開する方式"},
   {x:'Branch で <span class="en">main</span> を選ぶ'},
   {x:'フォルダで「📁 /(root)」を選ぶ',w:"フラット構成なので、いちばん上の階層でOK"},
   {x:'<span class="en">Save</span> を押す',w:"数分待つと Visit site（URL）が出る"},
   {x:"表示されたURLを開いて、アプリが動くか確かめる"},
   {x:"Safariの共有ボタンから、ホーム画面に追加する"}]}
];

var SAFETY=[
 {t:"お金のこと",body:"<ul>"
  +"<li>アカウント作成、公開リポジトリ、GitHub Pagesでの公開は無料の範囲で使えます。</li>"
  +"<li>お金がかかるのは、有料プランに自分で申し込んだときだけです。</li>"
  +"<li>カード情報を求める画面が出たら、いったん止めて内容を読みます。手順どおりなら出ません。</li></ul>"},
 {t:"公開されるもの / されないもの",body:"<ul>"
  +"<li>公開される：アップロードしたファイル、リポジトリ名、README。</li>"
  +"<li>公開されない：パスワード、他のリポジトリ、アプリに入力したデータ。</li></ul>"},
 {t:"絶対に入れないもの",warn:true,body:"<ul>"
  +"<li>パスワード、APIキー、認証情報</li>"
  +"<li>自分や他人の個人情報</li></ul>"}
];

/* ===== 共通 ===== */
function $(s){return document.querySelector(s);}
function esc(s){return (s||"").replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
var tid;
function toast(m){var t=$("#toast");t.textContent=m;t.classList.add("on");clearTimeout(tid);tid=setTimeout(function(){t.classList.remove("on");},2200);}
async function copy(text){
  try{await navigator.clipboard.writeText(text);toast("コピーしました");}
  catch(e){
    var ta=document.createElement("textarea");ta.value=text;ta.style.position="fixed";ta.style.opacity="0";
    document.body.appendChild(ta);ta.select();
    try{document.execCommand("copy");toast("コピーしました");}catch(_){toast("長押しで選択してコピーしてください");}
    ta.remove();}
}
var PAGES=[["tab-memo","pg-memo"],["tab-make","pg-make"],["tab-shelf","pg-shelf"]];
PAGES.forEach(function(pair){
  document.getElementById(pair[0]).addEventListener("click",function(){
    PAGES.forEach(function(p){
      var s=(p[0]===pair[0]);
      document.getElementById(p[0]).setAttribute("aria-selected",s);
      document.getElementById(p[1]).hidden=!s;});
    window.scrollTo({top:0,behavior:"smooth"});});
});

/* ===== チップ ===== */
function chips(host,list){
  var el=$(host);el.innerHTML="";
  list.forEach(function(v){
    var b=document.createElement("button");
    b.className="chip";b.type="button";b.textContent=v;b.dataset.v=v;
    b.setAttribute("aria-pressed","false");
    b.addEventListener("click",function(){
      b.setAttribute("aria-pressed",b.getAttribute("aria-pressed")==="true"?"false":"true");render();});
    el.appendChild(b);});
}
function picked(h){return Array.prototype.map.call(document.querySelectorAll(h+" .chip[aria-pressed='true']"),function(b){return b.dataset.v;});}
function setPicked(h,v){Array.prototype.forEach.call(document.querySelectorAll(h+" .chip"),function(b){
  b.setAttribute("aria-pressed",(v||[]).indexOf(b.dataset.v)>=0?"true":"false");});}
chips("#c-func",FUNCS);chips("#c-look",LOOKS);chips("#c-care",CARES);

/* ===== タグ ===== */
function drawTags(keep){
  var sel=keep||picked("#c-tag");
  var el=$("#c-tag");el.innerHTML="";
  tags.forEach(function(t){
    var b=document.createElement("button");
    b.className="chip";b.type="button";b.dataset.v=t.id;
    b.setAttribute("aria-pressed",sel.indexOf(t.id)>=0?"true":"false");
    b.innerHTML='<span class="dot" style="background:'+t.c+'"></span>'+esc(t.n)+(tagEdit?'<span class="x">✕</span>':"");
    b.addEventListener("click",async function(e){
      if(tagEdit){
        if(e.target.classList.contains("x")){
          if(!confirm("タグ「"+t.n+"」を消しますか？"))return;
          tags=tags.filter(function(v){return v.id!==t.id;});
          ideas.forEach(function(i){i.tags=(i.tags||[]).filter(function(k){return k!==t.id;});});
          await store.set(KEY_TAGS,tags);await store.set(KEY_IDEAS,ideas);
          drawTags();drawShelf();return;
        }
        if(e.target.classList.contains("dot")){
          t.c=PALETTE[(PALETTE.indexOf(t.c)+1)%PALETTE.length];
          await store.set(KEY_TAGS,tags);drawTags();drawShelf();return;
        }
        var n=prompt("タグの名前",t.n);
        if(n&&n.trim()){t.n=n.trim();await store.set(KEY_TAGS,tags);drawTags();drawShelf();}
        return;
      }
      b.setAttribute("aria-pressed",b.getAttribute("aria-pressed")==="true"?"false":"true");render();
    });
    el.appendChild(b);
  });
  var add=document.createElement("button");
  add.className="chip add";add.type="button";add.textContent="＋ タグを追加";
  add.addEventListener("click",async function(){
    var n=prompt("タグの名前");
    if(!n||!n.trim())return;
    tags.push({id:"t"+Date.now(),n:n.trim(),c:PALETTE[tags.length%PALETTE.length]});
    await store.set(KEY_TAGS,tags);drawTags();
  });
  el.appendChild(add);
  $("#tag-hint").textContent=tagEdit
    ?"編集中：名前をタップで書き換え、●で色を変更、✕で削除できます。"
    :(tags.length?"":"タグはまだありません。「＋ タグを追加」から作れます。");
  $("#b-tagedit").textContent=tagEdit?"完了":"編集";
}
$("#b-tagedit").addEventListener("click",function(){tagEdit=!tagEdit;drawTags();});

/* ===== プロンプト ===== */
function collect(){return{
  name:$("#f-name").value.trim(),one:$("#f-one").value.trim(),why:$("#f-why").value.trim(),
  who:$("#f-who").value.trim(),when:$("#f-when").value.trim(),pain:$("#f-pain").value.trim(),
  funcs:picked("#c-func"),funcFree:$("#f-func").value.trim(),
  looks:picked("#c-look"),lookFree:$("#f-look").value.trim(),
  cares:picked("#c-care"),careFree:$("#f-care").value.trim(),
  memo:$("#f-memo").value.trim(),tags:picked("#c-tag")};}
function body(d){
  var L=["iPhoneで使うWebアプリを1つ作ってください。","","【アプリ名】"+d.name];
  if(d.one)L.push("【一言でいうと】"+d.one);
  if(d.why)L.push("【作りたい理由】"+d.why);
  if(d.who||d.when||d.pain){L.push("","【使う場面】");
    if(d.who)L.push("・使う人："+d.who);
    if(d.when)L.push("・使う場面："+d.when);
    if(d.pain)L.push("・解決したい困りごと："+d.pain);}
  if(d.funcs.length||d.funcFree){L.push("","【入れたい機能】");
    d.funcs.forEach(function(f){L.push("・"+f);});
    if(d.funcFree)d.funcFree.split("\n").filter(Boolean).forEach(function(f){L.push("・"+f);});}
  if(d.looks.length||d.lookFree){L.push("","【見た目の好み】");
    if(d.looks.length)L.push("・"+d.looks.join("／"));
    if(d.lookFree)L.push("・"+d.lookFree);}
  if(d.cares.length||d.careFree){L.push("","【使い心地で配慮してほしいこと】");
    d.cares.forEach(function(f){L.push("・"+f);});
    if(d.careFree)L.push("・"+d.careFree);}
  if(d.memo)L.push("","【そのほかのメモ】",d.memo);
  if($("#f-common").checked)L.push("",COMMON);
  return L.join("\n");
}
function full(d){return HEAD+"\n\n"+body(d);}
function render(){var d=collect();$("#out").textContent=d.name?full(d):"アプリ名を入れると、ここに文章ができます。";}
["f-name","f-one","f-why","f-who","f-when","f-pain","f-func","f-look","f-care","f-memo"].forEach(function(id){
  document.getElementById(id).addEventListener("input",render);});
$("#f-common").addEventListener("change",render);

$("#b-copy").addEventListener("click",function(){
  var d=collect();
  if(!d.name){toast("先にアプリ名を入れてください");$("#f-name").focus();return;}
  copy(full(d));});

async function saveIdea(){
  var d=collect();
  if(!d.name){toast("先にアプリ名を入れてください");$("#f-name").focus();return false;}
  var wasEdit=!!editingId;
  if(editingId){
    var i=-1;ideas.forEach(function(v,k){if(v.id===editingId)i=k;});
    if(i>=0){var merged=Object.assign({},ideas[i],d,{updated:Date.now()});ideas[i]=merged;}
  }else{
    var o=Object.assign({id:"i"+Date.now()},d,{created:Date.now(),made:false,icon:"",shot:""});
    ideas.unshift(o);
  }
  await store.set(KEY_IDEAS,ideas);drawShelf();
  return wasEdit?"edit":"new";
}
function clearForm(){
  ["f-name","f-one","f-why","f-who","f-when","f-pain","f-func","f-look","f-care","f-memo"].forEach(function(id){
    document.getElementById(id).value="";});
  ["#c-func","#c-look","#c-care"].forEach(function(h){setPicked(h,[]);});
  setPicked("#c-tag",[]);
  editingId=null;$("#editing-note").hidden=true;render();
}
$("#b-save").addEventListener("click",async function(){
  var r=await saveIdea();if(!r)return;
  editingId=null;$("#editing-note").hidden=true;
  toast(r==="edit"?"上書きしました":"ノートに保存しました");});
$("#b-clear").addEventListener("click",async function(){
  var r=await saveIdea();if(!r)return;
  clearForm();toast("ノートに保存して、入力を消しました");});

/* ===== 手順 ===== */
function drawSteps(){
  var host=$("#steps");
  var open=Array.prototype.map.call(host.children,function(e){return e.dataset.open;});
  host.innerHTML="";
  STEPS.forEach(function(s,si){
    var all=s.items.every(function(_,i){return checks[si+"-"+i];});
    var sec=document.createElement("section");
    sec.className="step";sec.dataset.open=open[si]||"0";
    var h=document.createElement("button");h.className="head";h.type="button";
    h.innerHTML='<span class="dot" style="background:'+(all?s.c:"#DCD8D0")+'">'+(all?TICK:(si+1))+'</span>'
      +'<span class="ttl">'+s.t+'</span><span class="arw">›</span>';
    var b=document.createElement("div");b.className="body";b.hidden=sec.dataset.open!=="1";

    s.items.forEach(function(it,ii){
      var l=document.createElement("label");l.className="check";
      var c=document.createElement("input");c.type="checkbox";c.checked=!!checks[si+"-"+ii];
      var box=document.createElement("span");box.className="box";box.innerHTML=TICK;
      if(c.checked){box.style.background=s.c;box.style.borderColor=s.c;}
      var t=document.createElement("span");t.className="tx";
      t.innerHTML="<span>"+it.x+"</span>"+(it.w?'<span class="why">'+it.w+"</span>":"");
      c.addEventListener("change",async function(){
        checks[si+"-"+ii]=c.checked;
        await store.set(KEY_STEPS,checks);drawSteps();drawGauge();});
      l.appendChild(c);l.appendChild(box);l.appendChild(t);b.appendChild(l);
    });
    if(s.final){
      var box2=document.createElement("div");box2.className="info";
      box2.innerHTML="<pre>"+esc(FINAL_PROMPT)+"</pre>";
      var cb=document.createElement("button");cb.className="btn tint small";cb.style.marginTop="10px";
      cb.textContent="プロンプトをコピー";
      cb.addEventListener("click",function(){copy(FINAL_PROMPT);});
      b.appendChild(box2);b.appendChild(cb);
    }
    if(s.note){
      var n=document.createElement("div");n.className="info";
      n.innerHTML='<span class="nt">'+s.note.t+"</span>"+s.note.b;
      b.appendChild(n);
    }
    h.addEventListener("click",function(){
      var o=sec.dataset.open==="1";sec.dataset.open=o?"0":"1";b.hidden=o;});
    sec.appendChild(h);sec.appendChild(b);host.appendChild(sec);
  });
}
function drawGauge(){
  var m=$("#marks");m.innerHTML="";
  STEPS.forEach(function(s,si){
    var done=s.items.every(function(_,i){return checks[si+"-"+i];});
    var d=document.createElement("div");d.className="mk";
    if(done)d.style.background=s.c;
    m.appendChild(d);});
}
function drawSafety(){
  var host=$("#safety");host.innerHTML="";
  var g=document.createElement("div");g.className="group safety-box";
  SAFETY.forEach(function(s,i){
    var n=document.createElement("div");
    n.className="info"+(s.warn?" warn":"");
    n.style.marginTop=i?"12px":"0";
    n.innerHTML='<span class="nt">'+s.t+"</span>"+s.body;
    g.appendChild(n);});
  host.appendChild(g);
}
$("#b-reset").addEventListener("click",async function(){
  if(!confirm("チェックを全部外します。ノートの中身は消えません。よろしいですか？"))return;
  checks={};await store.set(KEY_STEPS,checks);drawSteps();drawGauge();toast("リセットしました");});

/* ===== ノート ===== */
function tagOf(id){var f=null;tags.forEach(function(t){if(t.id===id)f=t;});return f;}
function ymd(ts){var d=new Date(ts);
  return d.getFullYear()+"."+String(d.getMonth()+1).padStart(2,"0")+"."+String(d.getDate()).padStart(2,"0");}
function drawShelf(){
  var host=$("#shelf");host.innerHTML="";
  $("#cnt").textContent=ideas.length?ideas.length+"件":"";
  if(!ideas.length){
    host.innerHTML='<div class="empty"><div class="gk"></div><b>ノートはまだ空です</b>「アイデア」で1件目を保存すると、ここに並びます。</div>';
    return;}
  ideas.forEach(function(it,idx){
    var c=document.createElement("button");c.className="idea";c.type="button";
    var tg=(it.tags||[]).map(function(k){
      var t=tagOf(k);return t?'<span class="tg" style="background:'+t.c+'">'+esc(t.n)+"</span>":"";}).join("");
    c.innerHTML=(it.icon?'<img class="ic" src="'+it.icon+'" alt="">':"")
      +'<span class="txt"><h3>'+esc(it.name)+"</h3>"
      +"<p>"+esc(it.one||it.why||"（説明はまだありません）")+"</p>"
      +(tg?'<span class="tagline">'+tg+"</span>":"")
      +'<span class="date">'+ymd(it.created)+"</span></span>"
      +(it.made?stampHTML(true):"");
    c.addEventListener("click",function(){openPage(idx);});
    host.appendChild(c);
  });
}

/* ===== 詳細シート ===== */
function openPage(idx){
  var it=ideas[idx],p=$("#sheet");
  var rows=[["一言でいうと",it.one],["作りたい理由",it.why],["使う人",it.who],["使う場面",it.when],
    ["困りごと",it.pain],
    ["入れたい機能",(it.funcs||[]).concat([it.funcFree]).filter(Boolean).join("／")],
    ["見た目",(it.looks||[]).concat([it.lookFree]).filter(Boolean).join("／")],
    ["配慮",(it.cares||[]).concat([it.careFree]).filter(Boolean).join("／")],
    ["メモ",it.memo]].filter(function(r){return r[1];});
  p.innerHTML='<div class="grab"></div>'
    +'<div class="stop">'+(it.icon?'<img src="'+it.icon+'" alt="">':"")
    +"<h2>"+esc(it.name)+"</h2>"
    +'<button class="cl" id="p-close">閉じる</button></div>'
    +'<div class="group"><div class="stamprow">'
    +'<button class="stampbtn" id="p-stamp" aria-pressed="'+(it.made?"true":"false")+'" aria-label="COOKEDのハンコを押す">'+stampHTML()+"</button>"
    +'<span class="cap" id="p-stampcap"></span></div></div>'
    +'<p class="ghead">'+ymd(it.created)+" に記録"+(it.updated?"／"+ymd(it.updated)+" に更新":"")+"</p>"
    +'<div class="group">'+rows.map(function(r){
        return '<div class="dlrow"><dt>'+r[0]+"</dt><dd>"+esc(r[1])+"</dd></div>";}).join("")+"</div>"
    +'<p class="ghead">アイコン・画面写真</p>'
    +'<div class="group"><div class="imgpick">'
    +'<label>アイコンを選ぶ<input type="file" accept="image/*" id="p-icon"></label>'
    +'<label>画面写真を選ぶ<input type="file" accept="image/*" id="p-shot"></label></div>'
    +(it.shot?'<div class="shots"><img src="'+it.shot+'" alt="画面写真"></div>':"")+"</div>"
    +'<div class="stack">'
    +'<button class="btn" id="p-copy">プロンプトをコピー</button>'
    +'<button class="btn tint" id="p-edit">この内容を編集する</button>'
    +'<button class="btn plain" id="p-del">削除</button></div>'
    +'<div class="turnrow">'
    +'<button id="p-prev"'+(idx<=0?" disabled":"")+">◀\uFE0E 前のページ</button>"
    +"<span>"+(idx+1)+" / "+ideas.length+"</span>"
    +'<button id="p-next"'+(idx>=ideas.length-1?" disabled":"")+">次のページ ▶\uFE0E</button></div>";

  p.querySelector("#p-stampcap").textContent=it.made?"つくった":"完成したら、ハンコを押しましょう";
  p.querySelector("#p-stamp").addEventListener("click",async function(){
    it.made=!it.made;await store.set(KEY_IDEAS,ideas);drawShelf();openPage(idx);
    toast(it.made?"ハンコを押しました":"ハンコを消しました");});
  p.querySelector("#p-close").addEventListener("click",closePage);
  p.querySelector("#p-prev").addEventListener("click",function(){openPage(idx-1);});
  p.querySelector("#p-next").addEventListener("click",function(){openPage(idx+1);});
  p.querySelector("#p-copy").addEventListener("click",function(){copy(full(it));});
  p.querySelector("#p-del").addEventListener("click",async function(){
    if(!confirm("「"+it.name+"」をノートから削除します。よろしいですか？"))return;
    ideas.splice(idx,1);await store.set(KEY_IDEAS,ideas);closePage();drawShelf();toast("削除しました");});
  p.querySelector("#p-edit").addEventListener("click",function(){
    loadToForm(it);closePage();document.getElementById("tab-memo").click();});
  p.querySelector("#p-icon").addEventListener("change",function(e){pickImg(e,idx,"icon",256);});
  p.querySelector("#p-shot").addEventListener("change",function(e){pickImg(e,idx,"shot",800);});
  $("#spread").hidden=false;document.body.style.overflow="hidden";
  p.scrollTop=0;
}
function closePage(){$("#spread").hidden=true;document.body.style.overflow="";}
$("#spread").addEventListener("click",function(e){if(e.target.id==="spread")closePage();});
document.addEventListener("keydown",function(e){if(e.key==="Escape"&&!$("#spread").hidden)closePage();});

function pickImg(e,idx,field,max){
  var f=e.target.files&&e.target.files[0];if(!f)return;
  var r=new FileReader();
  r.onload=function(){
    var img=new Image();
    img.onload=async function(){
      var sc=Math.min(1,max/Math.max(img.width,img.height));
      var cv=document.createElement("canvas");
      cv.width=Math.round(img.width*sc);cv.height=Math.round(img.height*sc);
      cv.getContext("2d").drawImage(img,0,0,cv.width,cv.height);
      ideas[idx][field]=cv.toDataURL("image/jpeg",.72);
      await store.set(KEY_IDEAS,ideas);drawShelf();openPage(idx);toast("画像を登録しました");};
    img.src=r.result;};
  r.readAsDataURL(f);
}
function loadToForm(it){
  editingId=it.id;
  $("#f-name").value=it.name||"";$("#f-one").value=it.one||"";$("#f-why").value=it.why||"";
  $("#f-who").value=it.who||"";$("#f-when").value=it.when||"";$("#f-pain").value=it.pain||"";
  $("#f-func").value=it.funcFree||"";$("#f-look").value=it.lookFree||"";$("#f-care").value=it.careFree||"";
  $("#f-memo").value=it.memo||"";
  setPicked("#c-func",it.funcs);setPicked("#c-look",it.looks);setPicked("#c-care",it.cares);
  drawTags(it.tags||[]);
  var n=$("#editing-note");n.hidden=false;
  n.textContent="いま「"+it.name+"」を編集中です。保存すると上書きされます。";
  render();
}

(async function init(){
  ideas=(await store.get(KEY_IDEAS))||[];
  checks=(await store.get(KEY_STEPS))||{};
  tags=(await store.get(KEY_TAGS))||[];
  drawTags([]);drawSteps();drawGauge();drawSafety();drawShelf();render();
})();

/* ===== Service Worker ===== */
if("serviceWorker" in navigator && location.protocol.indexOf("http")===0){
  window.addEventListener("load",function(){
    navigator.serviceWorker.register("./sw.js").catch(function(){});
  });
}
})();
