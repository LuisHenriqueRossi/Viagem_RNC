// Script da página de voos, com catálogo, filtros, compra simulada e reservas.
// Essa parte antes ficava na página inicial. O núcleo é o mesmo das outras páginas.

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

/* Página de voos com catálogo, filtros, modais, compra e reservas */
// Estado da página, que muda conforme o usuário usa.
// voos é o catálogo, vooAtual é o voo do modal e ultimoFoco é quem tinha o foco antes do modal.
// limite é a quantidade de cards na tela e tToast é o timer do alerta dos filtros.
let voos=carregarVoos(),vooAtual=null,ultimoFoco=null,limite=12,tToast=null;
// Salva o catálogo, usado depois de comprar ou cancelar porque os assentos mudam.
const salvarVoos=()=>gravar(K.voos,voos);
// Devolve a data de hoje como texto AAAA/MM/DD pra comparar datas.
const hoje=()=>new Date().toISOString().slice(0,10);
// Diz se algum filtro, fora a ordenação, está preenchido.
const filtrosAtivos=()=>$$('#filtros select,#filtros input').some(e=>e.id!=='fOrdem'&&e.value);

// Preenche as cidades conforme o estado escolhido e mantém a cidade marcada se der.
function atualizarCidades(){
  const uf=$('#fEstado').value,at=$('#fCidade').value;
  $('#fCidade').innerHTML='<option value="">Todas</option>'+CIDADES.filter(c=>!uf||c[1]===uf).map(c=>`<option ${c[0]===at?'selected':''}>${esc(c[0])}</option>`).join('');
}

/* Todos os filtros funcionam juntos e o preço usa o valor final */
// Aplica todos os filtros ao mesmo tempo. Campo vazio não filtra e o preço comparado já tem desconto VIP.
function filtrarViagens(){
  const uf=$('#fEstado').value,ci=$('#fCidade').value,mn=parseFloat($('#fMin').value),mx=parseFloat($('#fMax').value),cia=$('#fCia').value,h=$('#fHora').value;
  return voos.filter(v=>{const p=infoPreco(v).final;return(!uf||v.estado===uf)&&(!ci||v.cidade===ci)&&(isNaN(mn)||p>=mn)&&(isNaN(mx)||p<=mx)&&(!cia||v.cia===cia)&&(!h||v.saida>=h)});
}

// Ordena uma cópia da lista pelo critério escolhido, sem mexer na original.
function ordenarViagens(l,m){
  const p=v=>infoPreco(v).final,c=[...l];
  if(m==='menor')c.sort((a,b)=>p(a)-p(b));else if(m==='maior')c.sort((a,b)=>p(b)-p(a));
  else if(m==='alfa')c.sort((a,b)=>a.cidade.localeCompare(b.cidade,'pt-BR')||p(a)-p(b));
  else if(m==='duracao')c.sort((a,b)=>a.durMin-b.durMin);
  return c;
}

// Desenha os cards e corta a lista no limite. O botão de mostrar mais aumenta de 12 em 12.
function renderizarViagens(){
  const l=ordenarViagens(filtrarViagens(),$('#fOrdem').value);
  $('#grid').innerHTML=l.slice(0,limite).map(v=>cartaoHTML(v,false)).join('');
  $('#contador').textContent=`${l.length} voo(s) encontrado(s)`;
  $('#vazio').hidden=l.length>0;$('#maisBtn').hidden=l.length<=limite;
  return l.length;
}
// Roda quando um filtro muda, volta o limite pra 12, redesenha e mostra o resumo em alerta.
// O timer de 700 ms evita muitos alertas enquanto a pessoa digita.
function filtrosMudaram(){
  limite=12;const n=renderizarViagens();clearTimeout(tToast);
  tToast=setTimeout(()=>{if(!n)mostrarToast('Nenhum voo encontrado.','aviso');else if(filtrosAtivos())mostrarToast(`Filtros aplicados: ${n} voo(s).`,'info')},700);
}

/* Modais com animação de abrir e fechar */
// Abre o modal, guarda o foco anterior e leva o foco pra dentro.
function abrirOverlay(ov,foco){ultimoFoco=document.activeElement;ov.hidden=false;ov.classList.remove('saindo');(foco||$('[data-fechar]',ov)).focus()}
// Fecha o modal com animação, esconde depois de 250 ms e devolve o foco.
function fecharModal(ov){
  if(ov.hidden)return;ov.classList.add('saindo');
  setTimeout(()=>{ov.hidden=true;ov.classList.remove('saindo');if(ultimoFoco)ultimoFoco.focus()},250);
}

// Monta o HTML dos detalhes do voo, usado nos dois modais.
function infoVooHTML(v){
  const p=infoPreco(v);
  return `<ul class="info"><li>Companhia: ${esc(v.cia)} · código ${esc(v.numero)}</li><li>Partida ${v.saida} · chegada ${v.chegada} · duração ${v.duracao}</li><li>💺 ${v.assentos} assento(s) disponível(is)</li></ul><div class="preco">${p.pct?`<s>${brl(p.original)}</s> <b>${brl(p.final)}</b> <em>Desconto VIP −${p.pct}%</em>`:`<b>${brl(p.original)}</b> por passageiro`}</div>`;
}

// Abre o modal do voo, com detalhes ou com o formulário de compra.
function abrirModal(id,comprar){
  const v=voos.find(x=>x.id===id);if(!v)return;vooAtual=v;
  // Modo detalhes, que preenche título, foto e informações.
  if(!comprar){
    $('#dTitulo').textContent=`${v.cidade} — ${v.estado}`;
    $('#dFoto').innerHTML=`<span>${esc(v.cidade)}</span><img src="assets/images/${esc(v.imagem)}.jpg" alt="Vista de ${esc(v.cidade)}" onerror="this.style.display='none'">`;
    $('#dInfo').innerHTML=infoVooHTML(v);$('#dComprar').disabled=v.assentos<1;abrirOverlay($('#mDet'));
  // Modo compra, que bloqueia voo esgotado, limpa o formulário, trava data passada e limita passageiros aos assentos.
  }else{
    if(v.assentos<1)return mostrarToast('Este voo está esgotado.','aviso');
    $('#cTitulo').textContent=`Comprar: ${v.cidade} — ${v.estado}`;$('#cInfo').innerHTML=infoVooHTML(v);
    $('#formCompra').reset();$('#cData').min=hoje();$('#cQtd').max=v.assentos;atualizarResumo();abrirOverlay($('#mCompra'),$('#cNome'));
  }
}

// Recalcula subtotal, desconto VIP e total conforme a quantidade de passageiros.
function atualizarResumo(){
  if(!vooAtual)return;
  const q=parseInt($('#cQtd').value,10)||0,p=infoPreco(vooAtual),sub=vooAtual.preco*q,tot=Math.round(p.final*q*100)/100;
  $('#cResumo').innerHTML=`<b>Resumo da compra</b><br>${q} × ${esc(vooAtual.cidade)} — ${vooAtual.estado}<br>Subtotal: ${brl(sub)}${p.pct?`<br>Desconto VIP (${p.pct}%): −${brl(sub-tot)}`:''}<br><b>Total: ${brl(tot)}</b>`;
}

/* Compra simulada com validação, assentos, código e histórico */
// Valida os dados, calcula o total, tira os assentos, cria o código e salva no histórico.
function comprarPassagem(){
  const v=vooAtual,nome=$('#cNome').value.trim(),em=$('#cEmail').value.trim(),d=$('#cData').value,q=parseInt($('#cQtd').value,10);
  // Validações que interrompem a função e avisam o usuário do problema.
  if(nome.length<3)return mostrarToast('Informe o nome completo do comprador.','erro');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em))return mostrarToast('Informe um e-mail válido.','erro');
  if(!d||d<hoje())return mostrarToast('Escolha uma data de viagem a partir de hoje.','erro');
  if(!q||q<1)return mostrarToast('Informe a quantidade de passageiros.','erro');
  if(q>v.assentos)return mostrarToast(`Só há ${v.assentos} assento(s) disponível(is).`,'erro');
  // Cria o código da reserva com prefixo e 6 caracteres aleatórios em maiúsculas.
  const p=infoPreco(v),total=Math.round(p.final*q*100)/100,codigo='VRNC-'+Math.random().toString(36).slice(2,8).toUpperCase();
  // Tira os assentos vendidos e salva. O unshift põe a reserva nova no começo do histórico.
  v.assentos-=q;salvarVoos();
  const h=ler(K.hist,[]);h.unshift({codigo,vooId:v.id,cidade:v.cidade,estado:v.estado,cia:v.cia,qtd:q,total,pct:p.pct,nome,dataViagem:d,quando:new Date().toLocaleString('pt-BR')});gravar(K.hist,h);
  // Atualiza a tela e confirma a compra com alertas.
  fecharModal($('#mCompra'));renderizarViagens();renderizarHistorico();
  mostrarToast(`Compra simulada realizada com sucesso! Reserva ${codigo} para ${v.cidade} — ${v.estado}.`,'sucesso');
  if(p.pct)mostrarToast('Desconto VIP aplicado!','desconto');
}

// Lista as reservas salvas, ou a mensagem de vazio, cada uma com botão de cancelar.
function renderizarHistorico(){
  const h=ler(K.hist,[]);
  $('#historico').innerHTML=h.length?h.map(c=>`<div class="linha"><div><b>${esc(c.codigo)} · ${esc(c.cidade)} — ${esc(c.estado)}</b><br><small>${c.qtd} passageiro(s) · ${brl(c.total)}${c.pct?` · VIP −${c.pct}%`:''} · viagem em ${c.dataViagem.split('-').reverse().join('/')} · ${esc(c.nome)}</small></div><button class="btn btn-sec" data-cancelar="${esc(c.codigo)}">Cancelar reserva</button></div>`).join(''):'<p class="sub">Nenhuma reserva ainda.</p>';
}

// Cancela a reserva e devolve os assentos ao voo.
function cancelarReserva(cod){
  const h=ler(K.hist,[]),i=h.findIndex(x=>x.codigo===cod);if(i<0)return;
  const c=h.splice(i,1)[0],v=voos.find(x=>x.id===c.vooId);if(v){v.assentos+=c.qtd;salvarVoos()}
  gravar(K.hist,h);renderizarViagens();renderizarHistorico();mostrarToast(`Reserva ${cod} cancelada.`,'aviso');
}

/* Início da página de voos */
// Roda ao abrir a página e liga cada elemento ao seu evento.
function iniciar(){
  iniciarNucleo();
  // Preenche o filtro de companhias e desenha tudo a primeira vez.
  $('#fCia').innerHTML='<option value="">Todas</option>'+CIAS.map(c=>`<option>${esc(c)}</option>`).join('');
  atualizarCidades();renderizarViagens();renderizarHistorico();
  // Trocar o estado atualiza as cidades e os outros filtros usam um ouvinte só.
  $('#fEstado').onchange=()=>{atualizarCidades();filtrosMudaram()};
  $('#filtros').addEventListener('input',e=>{if(e.target.id!=='fEstado')filtrosMudaram()});
  $('#filtros').onsubmit=e=>e.preventDefault();
  // Botão de limpar filtros, que zera o formulário e redesenha.
  $('#limpar').onclick=()=>{$('#filtros').reset();atualizarCidades();limite=12;renderizarViagens();mostrarToast('Filtros limpos.','info')};
  $('#maisBtn').onclick=()=>{limite+=12;renderizarViagens()};
  // Um ouvinte só na grade cuida dos botões de todos os cards.
  $('#grid').onclick=e=>{const b=e.target.closest('[data-acao]');if(b)abrirModal(b.dataset.id,b.dataset.acao==='comprar')};
  // Botão comprar do modal de detalhes, que abre a compra do mesmo voo.
  $('#dComprar').onclick=()=>{const id=vooAtual.id;$('#mDet').hidden=true;abrirModal(id,true)};
  // Cada modal fecha ao clicar no fundo ou em algo com data fechar.
  $$('.overlay').forEach(ov=>{
    ov.onclick=e=>{if(e.target===ov||e.target.closest('[data-fechar]'))fecharModal(ov)};
  });
  // Atualiza o resumo quando a quantidade muda e no envio faz a compra sem recarregar.
  $('#cQtd').oninput=atualizarResumo;
  $('#formCompra').onsubmit=e=>{e.preventDefault();comprarPassagem()};
  // Teclado nos modais, onde Esc fecha e o Tab fica preso dentro da janela.
  document.addEventListener('keydown',e=>{
    const ov=$$('.overlay').find(o=>!o.hidden);if(!ov)return;
    if(e.key==='Escape')return fecharModal(ov);
    if(e.key==='Tab'){const f=$$('button:not([disabled]),input,select,a[href]',ov).filter(x=>x.offsetParent),a=f[0],z=f[f.length-1];
      if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus()}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus()}}
  });
  // Clique em cancelar reserva, também por delegação de eventos.
  $('#historico').onclick=e=>{const b=e.target.closest('[data-cancelar]');if(b)cancelarReserva(b.dataset.cancelar)};
  // Links de outras páginas abrem direto o modal do voo pelo parâmetro ver ou comprar.
  const p=new URLSearchParams(location.search),id=p.get('ver')||p.get('comprar');
  if(id)abrirModal(id,!!p.get('comprar'));
}

// Chama a inicialização assim que o script carrega.
iniciar();
