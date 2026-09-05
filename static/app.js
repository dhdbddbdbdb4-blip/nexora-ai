let state={columns:["Название","Количество","Цена"],rows:[["Пример",1,100]],projectId:null,chat:[]};
let undoStack=[],redoStack=[];
const $=id=>document.getElementById(id);
const audienceData={
 personal:{intro:'Бюджет, учёба, планы, покупки, тексты и личные задачи.',cards:[
  ['💰','Личный бюджет','Доходы и расходы','Создай таблицу личного бюджета на месяц'],
  ['🛒','Покупки','Список и сравнение цен','Составь список покупок на неделю'],
  ['📚','Учёба','Объяснение и конспекты','Объясни тему простыми словами и сделай конспект'],
  ['📅','План дня','Задачи и приоритеты','Составь план моего дня с приоритетами']
 ],tools:[
  ['🏠 Домашний бюджет','Доходы, расходы и накопления','Создай таблицу домашнего бюджета на 12 месяцев'],
  ['✈️ Поездка','Маршрут и расходы','Составь план поездки с маршрутом и бюджетом'],
  ['🍎 Меню на неделю','Питание и покупки','Составь меню на неделю и список продуктов']
 ]},
 business:{intro:'Продажи, финансы, клиенты, команда, KPI и документы для бизнеса.',cards:[
  ['📈','KPI бизнеса','Показатели и цели','Создай таблицу KPI бизнеса на месяц'],
  ['👥','CRM клиентов','Клиенты и сделки','Создай CRM-таблицу клиентов со статусами сделок'],
  ['💵','Финансы','Доходы, расходы, прибыль','Проанализируй финансовые показатели компании'],
  ['📣','Маркетинг','Идеи и контент','Составь маркетинговый план на месяц']
 ],tools:[
  ['🧾 Счета и расходы','Контроль денежных потоков','Создай таблицу счетов и расходов компании'],
  ['📦 Склад','Остатки и закупки','Создай таблицу учёта склада с минимальным остатком'],
  ['🎯 План продаж','Цели менеджеров','Создай план продаж по менеджерам и месяцам']
 ]}
};
let audience=localStorage.getItem('audience')||'personal';
function renderAudience(){
 const d=audienceData[audience];
 document.querySelectorAll('.audienceBtn').forEach(b=>b.classList.toggle('active',b.dataset.audience===audience));
 if($('audienceIntro'))$('audienceIntro').textContent=d.intro;
 if($('featureGrid'))$('featureGrid').innerHTML=d.cards.map(x=>`<button onclick="suggest(${JSON.stringify(x[3])})"><i>${x[0]}</i><b>${x[1]}</b><small>${x[2]}</small></button>`).join('');
 if($('audienceTools'))$('audienceTools').innerHTML=d.tools.map(x=>`<button onclick="suggest(${JSON.stringify(x[2])});showTab('chat')"><b>${x[0]}</b><small>${x[1]}</small></button>`).join('');
}
document.querySelectorAll('.audienceBtn').forEach(b=>b.onclick=()=>{audience=b.dataset.audience;localStorage.setItem('audience',audience);renderAudience();toast(audience==='business'?'Режим для бизнеса включён':'Режим для жизни включён')});

function toast(t){let x=$("toast");x.textContent=t;x.classList.add("show");clearTimeout(window.__toast);window.__toast=setTimeout(()=>x.classList.remove("show"),2400)}
function snapshot(){return JSON.stringify({columns:state.columns,rows:state.rows})}
function pushHistory(){undoStack.push(snapshot());if(undoStack.length>40)undoStack.shift();redoStack=[]}
function restore(s){let d=JSON.parse(s);state.columns=d.columns;state.rows=d.rows;renderAudience();render();renderStats()}
function undo(){if(!undoStack.length)return toast("История пуста");redoStack.push(snapshot());restore(undoStack.pop());toast("Отменено")}
function redo(){if(!redoStack.length)return toast("Нечего вернуть");undoStack.push(snapshot());restore(redoStack.pop());toast("Повторено")}
function esc(x){return String(x??"").replaceAll("&","&amp;").replaceAll('"',"&quot;").replaceAll("<","&lt;").replaceAll(">","&gt;")}
function cellText(x){if(x==null)return "";if(typeof x==='object'){if('value'in x)return cellText(x.value);if(Array.isArray(x))return x.map(cellText).join(', ');return Object.values(x).map(cellText).join(', ')}return String(x)}
async function api(url,opt={}){let r=await fetch(url,{...opt,headers:{"Content-Type":"application/json",...(opt.headers||{})}});if(!r.ok){let t=await r.text();try{let d=JSON.parse(t);throw Error(d.detail||t)}catch(e){if(e instanceof Error&&e.message!==t)throw e;throw Error(t)}}return r}
document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>showTab(b.dataset.tab));document.querySelectorAll('[data-mobile]').forEach(b=>b.onclick=()=>{showTab(b.dataset.mobile);document.querySelectorAll('[data-mobile]').forEach(x=>x.classList.toggle('active',x.dataset.mobile===b.dataset.mobile))});
function showTab(t){document.querySelectorAll('.nav').forEach(x=>x.classList.toggle('active',x.dataset.tab===t));document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.id===t));let n={chat:['AI-ассистент','Поговори с AI или попроси его сделать таблицу.'],table:['Таблицы','Создавай, исправляй и экспортируй данные.'],analytics:['Аналитика','Статистика текущей таблицы.'],reports:['Доклады','Создавай структурированные документы.'],images:['Изображения','Готовь промты для генераторов изображений.'],tools:['Инструменты','Шаблоны и быстрые операции.']}[t];$('title').textContent=n[0];$('sub').textContent=n[1];if(t==='table')render();if(t==='analytics')renderStats()}
async function health(){try{let d=await(await fetch('/api/health')).json();$('status').textContent=d.ai?'● AI подключён • '+d.model:'● AI не подключён';$('status').className=d.ai?'ok':'bad'}catch(e){$('status').textContent='● Сервер недоступен'}}health();setInterval(health,10000);
function addMsg(role,text){let d=document.createElement('div');d.className='msg '+role;d.innerHTML='<div class="bubble">'+esc(text)+'</div>';$('messages').appendChild(d);$('messages').scrollTop=$('messages').scrollHeight}
function suggest(t){$('chatInput').value=t;$('chatInput').focus()}
async function sendChat(){let input=$('chatInput'),p=input.value.trim();if(!p)return;addMsg('user',p);input.value='';addMsg('assistant','⏳ Думаю…');let last=$('messages').lastElementChild;try{let d=await(await api('/api/ai/chat',{method:'POST',body:JSON.stringify({prompt:p,history:state.chat})})).json();last.querySelector('.bubble').textContent=d.answer;state.chat.push({role:'user',content:p},{role:'assistant',content:d.answer});if(state.chat.length>20)state.chat=state.chat.slice(-20)}catch(e){last.querySelector('.bubble').textContent='❌ '+e.message}}
$('chatInput').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChat()}});
function render(){let q=($('tableSearch')?.value||'').toLowerCase();let indexes=state.rows.map((_,i)=>i).filter(i=>!q||state.rows[i].some(v=>cellText(v).toLowerCase().includes(q)));let h='<div class="table-scroll"><table><thead><tr><th class="check"><input type="checkbox" onchange="toggleAll(this)"></th>'+state.columns.map((c,i)=>`<th><div class="th"><input value="${esc(c)}" onchange="pushHistory();state.columns[${i}]=this.value"><button onclick="sortTable(${i})">↕</button></div></th>`).join('')+'</tr></thead><tbody>';indexes.forEach(ri=>{h+='<tr><td class="check"><input class="row-select" type="checkbox" data-row="'+ri+'"></td>'+state.columns.map((_,ci)=>`<td><input value="${esc(state.rows[ri][ci]??'')}" onchange="pushHistory();state.rows[${ri}][${ci}]=this.value"></td>`).join('')+'</tr>'});h+='</tbody></table></div>';if(!indexes.length)h+='<div class="empty">Нет совпадений</div>';$('tableWrap').innerHTML=h;$('tableMeta').textContent=`${state.rows.length} строк · ${state.columns.length} столбцов`;}
function toggleAll(el){document.querySelectorAll('.row-select').forEach(x=>x.checked=el.checked)}
function selectedIds(){return [...document.querySelectorAll('.row-select:checked')].map(x=>+x.dataset.row)}
function addRow(){pushHistory();state.rows.push(state.columns.map(()=>''));render()}
function addCol(){pushHistory();state.columns.push('Новый столбец');state.rows.forEach(r=>r.push(''));render()}
function deleteRow(){let ids=selectedIds();if(!ids.length)return toast('Выбери строки');pushHistory();state.rows=state.rows.filter((_,i)=>!ids.includes(i));render();toast('Строки удалены')}
function duplicateSelected(){let ids=selectedIds();if(!ids.length)return toast('Выбери строки');pushHistory();ids.forEach(i=>state.rows.push([...state.rows[i]]));render();toast('Строки продублированы')}
function clearSelected(){let ids=selectedIds();if(!ids.length)return toast('Выбери строки');pushHistory();ids.forEach(i=>state.rows[i]=state.columns.map(()=>''));render();toast('Строки очищены')}
function removeDuplicates(){let seen=new Set(),out=[];state.rows.forEach(r=>{let k=JSON.stringify(r);if(!seen.has(k)){seen.add(k);out.push(r)}});if(out.length===state.rows.length)return toast('Дубликатов нет');pushHistory();state.rows=out;render();toast('Дубликаты удалены')}
function fillNumbers(){pushHistory();let col=state.columns.findIndex(x=>/кол|номер|№|id/i.test(x));if(col<0)col=0;state.rows.forEach((r,i)=>r[col]=i+1);render();toast('Нумерация заполнена')}
function addTotals(){pushHistory();let r=state.columns.map((c,i)=>{let vals=state.rows.map(x=>Number(String(x[i]).replace(',','.'))).filter(Number.isFinite);return i===0?'ИТОГО':vals.length?vals.reduce((a,b)=>a+b,0):''});state.rows.push(r);render();toast('Итоги добавлены')}
function sortTable(i){pushHistory();let numeric=state.rows.every(r=>r[i]!==''&&!isNaN(Number(r[i])));state.rows.sort((a,b)=>numeric?Number(a[i])-Number(b[i]):cellText(a[i]).localeCompare(cellText(b[i]),'ru'));render();toast('Таблица отсортирована')}
function transpose(){pushHistory();let oldCols=[...state.columns],oldRows=state.rows.map(r=>[...r]);state.columns=['',...oldRows.map((_,i)=>'Строка '+(i+1))];state.rows=oldCols.map((c,i)=>[c,...oldRows.map(r=>r[i]??'')]);render();toast('Таблица транспонирована')}
function clearTable(){pushHistory();state={...state,columns:['Колонка 1','Колонка 2'],rows:[['','']]};$('name').value='Новая таблица';render();toast('Таблица очищена')}
async function transform(){let instruction=$('transform').value.trim();if(!instruction)return toast('Напиши, что изменить');try{pushHistory();let d=await(await api('/api/ai/transform',{method:'POST',body:JSON.stringify({instruction,columns:state.columns,rows:state.rows})})).json();state={...state,...d};render();toast('AI обновил таблицу ✓')}catch(e){toast('Ошибка: '+e.message)}}
async function aiTableAnalysis(){try{let prompt='Проанализируй таблицу и дай краткие выводы, найди аномалии, пропуски, дубликаты и предложи улучшения. Таблица: '+JSON.stringify({columns:state.columns,rows:state.rows});showTab('chat');$('chatInput').value=prompt;await sendChat()}catch(e){toast(e.message)}}
async function saveProject(){try{let d=await(await api('/api/projects',{method:'POST',body:JSON.stringify({name:$('name').value,columns:state.columns,rows:state.rows,project_id:state.projectId})})).json();state.projectId=d.id;toast('Проект сохранён ✓')}catch(e){toast(e.message)}}
function newProject(){state={columns:['Название','Количество','Цена'],rows:[['',1,0]],projectId:null,chat:[]};undoStack=[];redoStack=[];$('name').value='Новая таблица';showTab('table');render()}
async function exportFile(url,ext){try{let r=await api(url,{method:'POST',body:JSON.stringify({name:$('name').value,columns:state.columns,rows:state.rows})});let b=await r.blob(),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=($('name').value||'table')+'.'+ext;a.click();toast('Файл готов')}catch(e){toast(e.message)}}
function copyTable(){let text=[state.columns,...state.rows].map(r=>r.map(cellText).join('\t')).join('\n');navigator.clipboard?.writeText(text).then(()=>toast('Таблица скопирована'))}
function copyText(id){let t=$(id).textContent;navigator.clipboard?.writeText(t).then(()=>toast('Скопировано'))}
$('file').onchange=async e=>{let f=e.target.files[0];if(!f)return;let fd=new FormData();fd.append('file',f);try{let r=await fetch('/api/upload',{method:'POST',body:fd});if(!r.ok)throw Error((await r.json()).detail);let d=await r.json();pushHistory();state={...state,...d,projectId:null};$('name').value=d.name;showTab('table');render();toast('Файл импортирован ✓')}catch(err){toast(err.message)}};
async function makeReport(){let p=$('reportPrompt').value.trim();if(!p)return toast('Напиши тему');$('report').textContent='⏳ Создаю…';try{let style=$('reportStyle').value;let d=await(await api('/api/ai/report',{method:'POST',body:JSON.stringify({prompt:p+'\nСтиль: '+style})})).json();$('report').textContent=d.report}catch(e){$('report').textContent='❌ '+e.message}}
function setImage(t){$('imagePrompt').value=t}
async function makeImagePrompt(){let p=$('imagePrompt').value.trim();if(!p)return toast('Опиши изображение');$('imageResult').textContent='⏳ Создаю…';try{let d=await(await api('/api/ai/chat',{method:'POST',body:JSON.stringify({prompt:`Создай профессиональный ENGLISH prompt для генерации изображения по описанию: ${p}. Верни только готовый prompt.`})})).json();$('imageResult').textContent=d.answer}catch(e){$('imageResult').textContent='❌ '+e.message}}
function renderStats(){let n=state.rows.length,c=state.columns.length,nums=[];state.columns.forEach((name,i)=>{let vals=state.rows.map(r=>Number(String(r[i]).replace(',','.'))).filter(Number.isFinite);if(vals.length)nums.push({name,sum:vals.reduce((a,b)=>a+b,0),avg:vals.reduce((a,b)=>a+b,0)/vals.length})});$('stats').innerHTML=[['Строк',n],['Столбцов',c],['Числовых колонок',nums.length],['Ячеек',n*c]].map(x=>`<div class="stat">${x[0]}<b>${x[1]}</b></div>`).join('');let max=Math.max(...nums.map(x=>Math.abs(x.sum)),1);$('chart').innerHTML=nums.length?nums.map(x=>`<div class="barWrap"><div class="bar" title="${esc(x.name)}: ${x.sum}" style="height:${Math.max(8,Math.abs(x.sum)/max*190)}px"></div><span>${esc(x.name.slice(0,12))}</span></div>`).join(''):'<div class="empty">Нет числовых данных</div>';let duplicate=state.rows.length-new Set(state.rows.map(JSON.stringify)).size;let missing=state.rows.reduce((s,r)=>s+r.filter(v=>cellText(v).trim()==='').length,0);$('insights').innerHTML=`<div><b>🔍 Качество данных</b><span>Пустых ячеек: ${missing} · Дубликатов строк: ${duplicate}</span></div>`}
function template(type){pushHistory();let sets={budget:{c:['Месяц','Доход','Расходы','Баланс'],r:Array.from({length:12},(_,i)=>['Месяц '+(i+1),'','',''])},sales:{c:['Товар','Количество','Цена','Сумма'],r:[['Ноутбук',2,50000,100000],['Телефон',5,25000,125000],['Наушники',10,3000,30000]]},tasks:{c:['Задача','Статус','Приоритет','Срок'],r:[['Подготовить отчёт','В работе','Высокий',''],['Позвонить клиенту','Новая','Средний',''],['Проверить данные','Готово','Низкий','']]},students:{c:['Ученик','Математика','Украинский','Информатика'],r:[['Ученик 1',10,11,12],['Ученик 2',9,10,11],['Ученик 3',12,12,10]]}}[type];state.columns=sets.c;state.rows=sets.r;$('name').value='Шаблон';showTab('table');render();toast('Шаблон создан')}
function toggleTheme(){document.body.classList.toggle('dark');localStorage.setItem('theme',document.body.classList.contains('dark')?'dark':'light');toast(document.body.classList.contains('dark')?'Тёмная тема':'Светлая тема')}
if(localStorage.getItem('theme')==='dark')document.body.classList.add('dark');
if(!$('messages').children.length)addMsg('assistant','Привет! 👋 Я твой AI-ассистент. Можешь просто поговорить со мной, создать таблицу, исправить данные, сделать анализ, доклад или подготовить prompt для изображения.');
render();
