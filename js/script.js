// Script da página inicial, que tem o planejador de tarefas da viagem.
// O catálogo de voos fica nos arquivos viagens.js e viagens.html.

/* Núcleo compartilhado, com dados, tema, alertas, VIP e menu */
// Nomes das chaves do localStorage, assim ninguém erra a digitação.
// voos é o catálogo, vip é o status, desc são os descontos, hist são as reservas, tarefas é o planejador, ia é o chat e tema é claro ou escuro.
const K={voos:'vrnc_voos2',vip:'vrnc_vip',desc:'vrnc_desc2',hist:'vrnc_hist2',tarefas:'vrnc_tarefas2',ia:'vrnc_ia2',tema:'vrnc_theme'};
// Lê um valor salvo e converte. Se não existir ou estiver quebrado, devolve o padrão.
const ler=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v===null?d:v}catch(e){return d}};
// Converte o valor em texto JSON e salva no localStorage.
const gravar=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
// Formata um número como moeda em reais.
const brl=n=>Number(n).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
// Atalho pra pegar o primeiro elemento que bate com o seletor.
const $=(s,r=document)=>r.querySelector(s);
// Atalho pra pegar todos os elementos do seletor já como array.
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Tira os acentos e deixa tudo minúsculo pra comparar texto.
const norm=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const slug=s=>norm(s).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

/* Tema claro e escuro */
// Troca o ícone do botão de tema entre sol e lua.
function atualizarBotaoTema(){const b=$('#btnTema');if(b)b.textContent=document.documentElement.dataset.theme==='dark'?'☀️':'🌙'}
// Aplica no html o tema salvo, que por padrão é o claro.
function carregarTema(){document.documentElement.dataset.theme=localStorage.getItem(K.tema)||'light';atualizarBotaoTema()}
// Inverte o tema, salva a escolha e aplica de novo.
function alternarTema(){localStorage.setItem(K.tema,document.documentElement.dataset.theme==='dark'?'light':'dark');carregarTema()}

/* Alertas na tela */
// Cria um alerta na tela. O tipo define a cor e o ícone.
function mostrarToast(msg,tipo='info'){
  // Pega o contêiner dos alertas ou cria um novo se faltar.
  let c=$('#toasts');if(!c){c=document.createElement('div');c.id='toasts';c.setAttribute('aria-live','polite');document.body.appendChild(c)}
  // Ícone de cada tipo de alerta.
  const ic={sucesso:'✅',erro:'❌',aviso:'⚠️',info:'ℹ️',vip:'👑',desconto:'🏷️'};
  // Monta o alerta com o texto já escapado.
  const t=document.createElement('div');t.className='toast '+tipo;
  t.innerHTML=`<span aria-hidden="true">${ic[tipo]||'ℹ️'}</span><p>${esc(msg)}</p><button aria-label="Fechar alerta">✕</button>`;
  // Anima a saída do alerta e remove ele depois de 300 ms.
  const fechar=()=>{t.classList.add('saindo');setTimeout(()=>t.remove(),300)};
  // O botão fecha na hora e o timer fecha sozinho em 5 segundos.
  t.querySelector('button').onclick=fechar;c.appendChild(t);setTimeout(fechar,5000);
}

/* Catálogo de voos fictícios gerado por contas fixas */
// Lista de cidades com o estado de cada uma.
const CIDADES=[['São Paulo','SP'],['Campinas','SP'],['Santos','SP'],['Ribeirão Preto','SP'],['São José dos Campos','SP'],['Rio de Janeiro','RJ'],['Niterói','RJ'],['Petrópolis','RJ'],['Cabo Frio','RJ'],['Angra dos Reis','RJ'],['Belo Horizonte','MG'],['Uberlândia','MG'],['Ouro Preto','MG'],['Juiz de Fora','MG'],['Poços de Caldas','MG']];
// Lista de companhias aéreas inventadas.
const CIAS=['Aerovia Brasil','Nuvem Air','Horizonte Linhas Aéreas','Costa Azul Aéreo','Planalto Air'];
// Converte minutos em texto de hora, tipo 06h05 no formato de relógio.
const fmtHora=m=>String(Math.floor(m/60)%24).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
// Gera os 75 voos com contas de resto, então o resultado é sempre o mesmo.
function gerarVoos(){
  const v=[];
  // i é a cidade e j é o voo dela, de 0 a 4.
  CIDADES.forEach(([cidade,estado],i)=>{for(let j=0;j<5;j++){
    // Calcula a duração em minutos e o minuto de partida.
    const dur=55+((i*37+j*23)%125),ini=(5+((i*2+j*4)%17))*60+[0,15,30,45][(i+j*2)%4];
    // Monta o objeto de cada voo com todos os dados e joga na lista.
    v.push({id:'f'+(i*5+j+1),cidade,estado,cia:CIAS[(i+j)%5],numero:'VR'+(1000+i*10+j),saida:fmtHora(ini),chegada:fmtHora(ini+dur),durMin:dur,duracao:Math.floor(dur/60)+'h'+String(dur%60).padStart(2,'0'),preco:Math.round((280+((i*53+j*71)%520))/10)*10,assentos:4+((i*7+j*11)%30),imagem:slug(cidade)});
  }});
  return v;
}

// Lê o catálogo salvo ou gera e salva um novo se faltar ou estiver incompleto.
function carregarVoos(){let v=ler(K.voos,null);if(!v||v.length<75){v=gerarVoos();gravar(K.voos,v)}return v}

/* VIP e preços */
// Diz se o usuário ativou o VIP.
const ehVIP=()=>ler(K.vip,false)===true;
// Lê o mapa de descontos salvo por voo.
const lerDescontos=()=>ler(K.desc,{});
// Calcula o preço com a porcentagem de desconto aplicada.
const aplicarDesconto=(preco,pct)=>Math.round(preco*(100-pct))/100;
// Devolve preço original, porcentagem e preço final. Só desconta se for VIP.
function infoPreco(v){const pct=ehVIP()?(lerDescontos()[v.id]||0):0;return{original:v.preco,pct,final:pct?aplicarDesconto(v.preco,pct):v.preco}}

/* Card de voo reutilizável */
// Monta o HTML do card, com botões ou links conforme o parâmetro links.
function cartaoHTML(v,links){
  const p=infoPreco(v);
  // Define os botões do card e desabilita Comprar se não tem assento.
  const bts=links?`<a class="btn" href="viagens.html?comprar=${v.id}">Comprar Passagem</a><a class="btn btn-sec" href="viagens.html?ver=${v.id}">Ver Detalhes</a>`:`<button class="btn" data-acao="comprar" data-id="${v.id}" ${v.assentos<1?'disabled':''}>Comprar Passagem</button><button class="btn btn-sec" data-acao="ver" data-id="${v.id}">Ver Detalhes</button>`;
  // Monta o card com foto, selo VIP, dados do voo e preço.
  return `<article class="card-v"><div class="foto"><span>${esc(v.cidade)}</span><img src="assets/images/${esc(v.imagem)}.jpg" alt="Vista de ${esc(v.cidade)}" loading="lazy" onerror="this.style.display='none'">${p.pct?`<span class="selo">VIP −${p.pct}%</span>`:''}</div>
  <div class="corpo"><h3>${esc(v.cidade)} — ${esc(v.estado)}</h3><ul class="info"><li>✈️ ${esc(v.cia)} · voo ${esc(v.numero)}</li><li>🕒 ${v.saida} → ${v.chegada} (${v.duracao})</li><li>${v.assentos>0?`💺 ${v.assentos} assentos`:'<strong class="esgotado">Esgotado</strong>'}</li></ul>
  <div class="preco">${p.pct?`<s>${brl(p.original)}</s> <b>${brl(p.final)}</b> <em>−${p.pct}%</em>`:`<b>${brl(p.original)}</b>`}</div><div class="acoes">${bts}</div></div></article>`;
}

// Inicia o que todas as páginas usam, como tema, menu e botões.
function iniciarNucleo(){
  carregarTema();
  // Pega o nome do arquivo da página atual.
  const atual=location.pathname.split('/').pop()||'index.html';
  // Marca no menu o link da página atual.
  $$('.nav a').forEach(a=>{if(a.getAttribute('href')===atual)a.setAttribute('aria-current','page')});
  // Faz o botão de tema alternar o tema.
  $('#btnTema').onclick=alternarTema;
  // Abre e fecha o menu do celular e avisa o estado pra leitores de tela.
  const mb=$('#menuBtn');mb.onclick=()=>{const o=$('#nav').classList.toggle('open');mb.setAttribute('aria-expanded',o)};
}

/* Planejador de tarefas da página inicial */
// Estado da página, com o id da tarefa em edição e a lista de tarefas salva.
let editandoT=null,tarefas=ler(K.tarefas,[]);
// Devolve a data de hoje como texto AAAA/MM/DD pra comparar datas.
const hoje=()=>new Date().toISOString().slice(0,10);

/* Planejador de viagens salvo no navegador */
// Salva a lista de tarefas no localStorage.
const salvarTarefas=()=>gravar(K.tarefas,tarefas);
// Filtra as tarefas pelo status, desenha a lista e atualiza contador e barra.
// Marca como atrasada a tarefa que não foi concluída e já passou do prazo.
function renderizarTarefas(){
  const f=$('#tFiltro').value,l=tarefas.filter(t=>f==='todas'||(f==='pendentes'?!t.ok:t.ok));
  const c=tarefas.filter(t=>t.ok).length,pct=tarefas.length?Math.round(c/tarefas.length*100):0;
  $('#listaTarefas').innerHTML=l.map(t=>`<li class="${t.ok?'ok':''}"><input type="checkbox" id="c${t.id}" data-concluir="${t.id}" ${t.ok?'checked':''}><label for="c${t.id}"><b>${esc(t.nome)}</b>${t.desc?`<br><small>${esc(t.desc)}</small>`:''}<br><small><span class="prio ${norm(t.prio)}">${esc(t.prio)}</span>${t.prazo?` · prazo ${t.prazo.split('-').reverse().join('/')}${!t.ok&&t.prazo<hoje()?' (atrasada)':''}`:''}</small></label><button class="btn btn-sec" data-tedit="${t.id}">Editar</button><button class="btn btn-perigo" data-texcluir="${t.id}">Excluir</button></li>`).join('')||'<li class="sub">Nenhuma tarefa aqui.</li>';
  $('#tContador').textContent=`${c} de ${tarefas.length} concluída(s) · ${pct}%`;
  $('#tProg').style.width=pct+'%';$('#tBarra').setAttribute('aria-valuenow',pct);
}

// Sai do modo de edição e limpa o formulário.
function limparFormTarefa(){editandoT=null;$('#formTarefa').reset();$('#tAdd').textContent='Adicionar tarefa';$('#tCancel').hidden=true}
// Cria uma tarefa nova ou atualiza a que está em edição.
function adicionarTarefa(){
  const nome=$('#tNome').value.trim();if(!nome)return mostrarToast('Digite o nome da tarefa.','erro');
  const d={nome,desc:$('#tDesc').value.trim(),prio:$('#tPrio').value,prazo:$('#tPrazo').value};
  if(editandoT){Object.assign(tarefas.find(x=>x.id===editandoT),d);mostrarToast('Tarefa atualizada.','info')}
  else{tarefas.push({id:Date.now(),ok:false,...d});mostrarToast('Tarefa adicionada.','sucesso')}
  limparFormTarefa();salvarTarefas();renderizarTarefas();
}

// Alterna a tarefa entre concluída e pendente.
function concluirTarefa(id){const t=tarefas.find(x=>x.id===id);t.ok=!t.ok;salvarTarefas();renderizarTarefas();if(t.ok)mostrarToast('Tarefa concluída! 🎉','sucesso')}
// Remove a tarefa pelo id e mantém as outras.
function excluirTarefa(id){tarefas=tarefas.filter(x=>x.id!==id);if(editandoT===id)limparFormTarefa();salvarTarefas();renderizarTarefas();mostrarToast('Tarefa excluída.','aviso')}
// Joga os dados da tarefa no formulário e muda o botão pra salvar.
function editarTarefa(id){const t=tarefas.find(x=>x.id===id);editandoT=id;$('#tNome').value=t.nome;$('#tDesc').value=t.desc;$('#tPrio').value=t.prio;$('#tPrazo').value=t.prazo;$('#tAdd').textContent='Salvar tarefa';$('#tCancel').hidden=false;$('#tNome').focus()}

/* Início da página */
// Roda ao abrir a página e liga os eventos do planejador.
function iniciar(){
  iniciarNucleo();
  renderizarTarefas();
  // Liga o envio do formulário, o cancelar e o filtro de status.
  $('#formTarefa').onsubmit=e=>{e.preventDefault();adicionarTarefa()};$('#tCancel').onclick=limparFormTarefa;$('#tFiltro').onchange=renderizarTarefas;
  // Trata os cliques de concluir, excluir e editar. O sinal de mais vira número.
  $('#listaTarefas').onclick=e=>{
    const c=e.target.closest('[data-concluir]'),x=e.target.closest('[data-texcluir]'),d=e.target.closest('[data-tedit]');
    if(c)concluirTarefa(+c.dataset.concluir);if(x)excluirTarefa(+x.dataset.texcluir);if(d)editarTarefa(+d.dataset.tedit);
  };
}

// Chama a inicialização assim que o script carrega.
iniciar();
