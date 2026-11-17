// Simulador de IA da página ia.html. Não usa IA de verdade e só segue regras com regex.
// A ordem é processar, interpretar, buscar, classificar, recomendar e montar o card.
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
// Troca os caracteres especiais do HTML por códigos seguros.
const esc=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Tira os acentos e deixa tudo minúsculo pra comparar texto.
const norm=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
// Gera um nome seguro pra URL e arquivo, com letras minúsculas e traços.
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

/* Simulador de recomendações por regras */
/* O ponto de troca por uma API de IA real é a função interpretarSolicitacao */
// Frases prontas que viram botões e preenchem o campo de texto.
const EXEMPLOS=['Quero viajar para São Paulo com até R$ 500.','Encontre um voo barato para Minas Gerais.','Quero viajar para o Rio de Janeiro.','Procure viagens com duração menor que 3 horas.','Quero uma viagem para Campinas.','Encontre os voos mais baratos disponíveis.'];
// Cidades que o usuário pode pedir mas que não existem no catálogo.
const AUSENTES=['curitiba','florianopolis','recife','fortaleza','brasilia','manaus','porto alegre','salvador','natal','belem','goiania','vitoria','porto seguro'];
// Nomes e siglas de cada estado, já sem acento.
const ESTADOS={SP:['sao paulo','sp'],RJ:['rio de janeiro','rj'],MG:['minas gerais','minas','mg']};

/* Acha estado ou cidade no texto */
// Procura cidades e estados no texto. O regex com barra b evita achar sigla dentro de outra palavra.
function identificarLocal(t){
  const cidades=CIDADES.filter(([c])=>t.includes(norm(c))).map(c=>c[0]);
  const estados=Object.keys(ESTADOS).filter(uf=>ESTADOS[uf].some(n=>new RegExp('\\b'+n+'\\b').test(t)));
  return{cidades,estados};
}
/* Funções que leem valores de preço no texto */
// Regex que acha expressões como até 500 ou acima de 300. Limite máximo vira max e limite mínimo vira min.
// O trecho de lookahead negativo impede confundir horas ou minutos com preço.
function identificarOrcamento(t){
  const m=/(abaixo de|ate|menos de|no maximo|maximo de|acima de|mais de|a partir de|por|r\$)\s*(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?)(?!\d)(?!\s*(?:h\b|hs\b|hora|min))/.exec(t);
  if(!m)return{};
  const n=parseFloat(m[2].replace(/\./g,'').replace(',','.'));
  return /acima|mais de|a partir/.test(m[1])?{min:n}:{max:n};
}
/* Funções que leem o tempo de voo no texto */
// Acha limites como menos de 3 horas ou até 90 min e devolve o valor em minutos.
function identificarDuracao(t){
  let m=/(menos de|menor que|ate|no maximo|maximo de|abaixo de)\s*(\d+)\s*(?:h|horas?)(?:\s*(?:e\s*)?(\d+)\s*(?:min\w*)?)?/.exec(t);
  if(m)return(+m[2])*60+(+m[3]||0);
  m=/(menos de|menor que|ate|no maximo|maximo de|abaixo de)\s*(\d+)\s*min/.exec(t);
  return m?+m[2]:null;
}
// Transforma o texto livre num objeto de critérios de busca.
// Os regex de barato, desconto e qualquer detectam palavras da intenção do usuário.
function interpretarSolicitacao(texto){
  const t=norm(texto),l=identificarLocal(t),o=identificarOrcamento(t);
  const s={texto,ausente:(l.cidades.length||l.estados.length)?null:AUSENTES.find(c=>t.includes(c))||null,cidades:l.cidades,estados:l.estados,min:o.min,max:o.max,durMax:identificarDuracao(t),
    barato:/barat|menor preco|mais baratos?|economic|em conta|menor valor/.test(t),
    desconto:/descont|promoc|oferta|vip/.test(t),
    qualquer:/voos?|viage(m|ns)|passagen|disponiv/.test(t)};
  s.reconhecido=!!(s.ausente||s.cidades.length||s.estados.length||s.min!==undefined||s.max!==undefined||s.durMax||s.barato||s.desconto||s.qualquer);
  return s;
}

/* Busca no catálogo com todos os critérios */
// Filtra os voos com assento pelos critérios. Cidade ausente devolve lista vazia.
function buscarViagens(s){
  if(s.ausente)return[];
  let l=carregarVoos().filter(v=>v.assentos>0);
  if(s.cidades.length||s.estados.length)l=l.filter(v=>s.cidades.includes(v.cidade)||s.estados.includes(v.estado));
  if(s.max!==undefined)l=l.filter(v=>infoPreco(v).final<=s.max);
  if(s.min!==undefined)l=l.filter(v=>infoPreco(v).final>=s.min);
  if(s.durMax)l=l.filter(v=>v.durMin<=s.durMax);
  if(s.desconto&&ehVIP()){const c=l.filter(v=>infoPreco(v).pct>0);if(c.length)l=c}
  return l;
}

/* Ordenação dos resultados */
// Ordena por custo benefício se for VIP, senão pelo menor preço e depois pela duração.
function classificar(l,s){
  const p=v=>infoPreco(v).final;
  const nota=v=>p(v)+v.durMin*.8;
  return [...l].sort((a,b)=>(ehVIP()&&!s.barato)?nota(a)-nota(b):p(a)-p(b)||a.durMin-b.durMin);
}

// Monta o texto de por que recomendar, com os motivos reais de cada voo.
function justificar(v,s,todos){
  const p=infoPreco(v),menor=Math.min(...todos.map(x=>infoPreco(x).final)),r=[];
  if(p.final===menor)r.push('Está entre os menores preços para esta busca.');
  if(s.cidades.includes(v.cidade))r.push(`É um voo para ${v.cidade}, como você pediu.`);
  else if(s.estados.includes(v.estado))r.push(`Atende ao estado solicitado (${v.estado}).`);
  if(s.max!==undefined)r.push(`Cabe no orçamento de ${brl(s.max)}.`);
  if(s.durMax)r.push(`Dura ${v.duracao}, dentro do limite pedido.`);
  if(p.pct)r.push(`Tem desconto VIP de ${p.pct}% (de ${brl(p.original)} por ${brl(p.final)}).`);
  if(v.durMin<=75)r.push('Voo curto.');
  if(v.assentos<=6)r.push(`Restam poucos assentos (${v.assentos}).`);
  return r.join(' ')||'Boa combinação de preço e duração entre os voos disponíveis.';
}
/* Parte da IA que recomenda viagens a partir do texto digitado */
// Escolhe a mensagem da IA e devolve os 5 melhores voos. O tamanho do texto varia a frase sem sorteio.
function recomendarViagens(s){
  const todos=classificar(buscarViagens(s),s),top=todos.slice(0,5),h=s.texto.length%2;
  let msg;
  if(!top.length)msg='Não encontramos voos compatíveis com sua busca.';
  else if(s.max!==undefined)msg=h?'Encontrei opções que correspondem ao seu orçamento!':'Estas opções cabem no valor que você indicou.';
  else if(s.barato)msg='Aqui estão os voos mais econômicos que encontrei!';
  else msg=h?'Encontrei algumas opções interessantes para você!':'Veja as melhores opções que selecionei no catálogo.';
  if(top.length&&!ehVIP())msg+=' Dica: usuários VIP têm descontos de 10% a 25% em voos selecionados (Área VIP).';
  if(top.length&&ehVIP()&&top.some(v=>infoPreco(v).pct))msg+=' Priorizei o melhor custo-benefício com seus descontos VIP.';
  return{msg,lista:top,todos,s};
}

// Monta o HTML do card de recomendação com justificativa e links.
function cartaoRec(v,r){
  const p=infoPreco(v);
  return `<article class="rec"><h3>${esc(v.cidade)} — ${esc(v.estado)}</h3><p>${esc(v.cia)} · voo ${esc(v.numero)}</p><p>🕒 ${v.saida} → ${v.chegada} (${v.duracao}) · 💺 ${v.assentos}</p><p class="preco">${p.pct?`<s>${brl(p.original)}</s> <b>${brl(p.final)}</b> <em>VIP −${p.pct}%</em>`:`<b>${brl(p.original)}</b>`}</p><p class="just"><b>Por que recomendo:</b> ${esc(justificar(v,r.s,r.todos))}</p><div class="ia-acoes"><a class="btn btn-sec" href="viagens.html?ver=${v.id}">Ver Detalhes</a><a class="btn" href="viagens.html?comprar=${v.id}">Comprar Passagem</a></div></article>`;
}

// Desenha o histórico do chat salvo, que tem até 20 mensagens, ou a saudação se estiver vazio.
function renderizarChat(){
  const h=ler(K.ia,[]);
  $('#chat').innerHTML=h.length?h.map(m=>`<div class="bolha ${m.de}">${m.de==='ia'?'🤖 ':''}${esc(m.txt)}</div>`).join(''):'<div class="bolha ia">🤖 Olá! Diga a cidade, o estado, o orçamento ou a duração que você procura.</div>';
  $('#chat').scrollTop=$('#chat').scrollHeight;
}

// Adiciona uma mensagem ao chat, guarda só as 20 últimas e redesenha.
function addChat(de,txt){const h=ler(K.ia,[]);h.push({de,txt});gravar(K.ia,h.slice(-20));renderizarChat()}
// Mostra o analisando com pontos animados por 1,1 segundo e devolve uma Promise.
function mostrarProcessamento(){
  const c=$('#chat'),d=document.createElement('div');d.className='bolha ia';d.id='digitando';d.innerHTML='<span class="pontos"><span></span><span></span><span></span></span> analisando…';c.appendChild(d);c.scrollTop=c.scrollHeight;$('#iaBtn').disabled=true;
  return new Promise(ok=>setTimeout(()=>{d.remove();$('#iaBtn').disabled=false;ok()},1100));
}

// Fluxo de envio, que valida, registra a pergunta, interpreta, recomenda e mostra os cards.
async function processar(texto){
  texto=texto.trim();if(!texto)return mostrarToast('Digite o que você procura.','erro');
  $('#iaRes').innerHTML='';addChat('eu',texto);$('#iaTexto').value='';
  await mostrarProcessamento();
  const s=interpretarSolicitacao(texto);
  if(!s.reconhecido)return addChat('ia','Não consegui entender sua solicitação. Tente informar uma cidade, um estado ou uma faixa de preço.');
  const r=recomendarViagens(s);addChat('ia',r.msg);
  if(!r.lista.length)return mostrarToast('Nenhum voo encontrado.','aviso');
  $('#iaRes').innerHTML=r.lista.map(v=>cartaoRec(v,r)).join('');mostrarToast('Destino recomendado pela IA!','sucesso');
  $('#iaRes').scrollIntoView({behavior:'smooth',block:'nearest'});
}

// Inicia a página e liga os botões de exemplo, o envio do formulário e o botão de limpar.
iniciarNucleo();renderizarChat();
$('#exemplos').innerHTML=EXEMPLOS.map((e,i)=>`<button type="button" data-e="${i}">${esc(e)}</button>`).join('');
$('#exemplos').onclick=e=>{const b=e.target.closest('[data-e]');if(b){$('#iaTexto').value=EXEMPLOS[b.dataset.e];$('#iaTexto').focus()}};
$('#iaForm').onsubmit=e=>{e.preventDefault();processar($('#iaTexto').value)};
$('#iaLimpar').onclick=()=>{gravar(K.ia,[]);$('#iaRes').innerHTML='';renderizarChat();$('#iaTexto').value=''};
