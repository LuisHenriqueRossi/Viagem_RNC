// Script da área VIP com ativação animada e voos com desconto.
// Quando o VIP é ativado, o status e os descontos ficam salvos no localStorage e valem em todas as páginas.
/* Núcleo compartilhado com dados, tema, toast, VIP e menu */
// Nomes das chaves do localStorage, juntos num lugar só pra evitar erro de digitação.
// voos é o catálogo, vip é o status VIP, desc são os descontos, hist são as reservas, tarefas é o planejador, ia é o chat e tema é claro ou escuro.
const K={voos:'vrnc_voos2',vip:'vrnc_vip',desc:'vrnc_desc2',hist:'vrnc_hist2',tarefas:'vrnc_tarefas2',ia:'vrnc_ia2',tema:'vrnc_theme'};
// Lê um valor salvo no localStorage e converte do JSON. Se não existir ou estiver quebrado, devolve o padrão d.
const ler=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v===null?d:v}catch(e){return d}};
// Converte o valor pra texto JSON e salva no localStorage.
const gravar=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
// Formata um número como dinheiro em reais, tipo 1234.5 vira R$ 1.234,50.
const brl=n=>Number(n).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
// Atalho pro querySelector, que pega só o primeiro elemento que bate com o seletor.
const $=(s,r=document)=>r.querySelector(s);
// Atalho pro querySelectorAll, já devolvendo array pra poder usar map e filter.
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
// Escapa os caracteres especiais do HTML pra evitar injeção de código vinda do usuário. A regex pega os caracteres perigosos.
const esc=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Tira os acentos e deixa tudo minúsculo, bom pra busca e comparação. A regex pega as marcas de acento soltas.
const norm=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
// Transforma o texto num nome seguro pra arquivo ou URL, tipo Rio de Janeiro vira rio de janeiro ligado por traços. As regex trocam o que não é letra ou número e limpam as pontas.
const slug=s=>norm(s).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

/* Controle do tema claro e escuro */
// Muda o ícone do botão, sol no tema escuro e lua no claro.
function atualizarBotaoTema(){const b=$('#btnTema');if(b)b.textContent=document.documentElement.dataset.theme==='dark'?'☀️':'🌙'}
// Aplica o tema salvo no atributo data theme do html, o CSS usa isso pra trocar as cores.
function carregarTema(){document.documentElement.dataset.theme=localStorage.getItem(K.tema)||'light';atualizarBotaoTema()}
// Inverte o tema, salva a escolha e aplica de novo. Vale pra todas as páginas.
function alternarTema(){localStorage.setItem(K.tema,document.documentElement.dataset.theme==='dark'?'light':'dark');carregarTema()}

/* Toast, o alerta flutuante, nos tipos sucesso, erro, aviso, info, vip e desconto */
// Cria um toast. O tipo define a cor e o ícone.
function mostrarToast(msg,tipo='info'){
  // Reaproveita o contêiner dos toasts e, se ainda não existir, cria e põe no body.
  let c=$('#toasts');if(!c){c=document.createElement('div');c.id='toasts';c.setAttribute('aria-live','polite');document.body.appendChild(c)}
  // Ícone de cada tipo de toast.
  const ic={sucesso:'✅',erro:'❌',aviso:'⚠️',info:'ℹ️',vip:'👑',desconto:'🏷️'};
  // Monta o toast e passa o texto pelo esc por segurança.
  const t=document.createElement('div');t.className='toast '+tipo;
  t.innerHTML=`<span aria-hidden="true">${ic[tipo]||'ℹ️'}</span><p>${esc(msg)}</p><button aria-label="Fechar alerta">✕</button>`;
  // Fechar aplica a classe da animação de saída e remove o elemento depois de 300 ms.
  const fechar=()=>{t.classList.add('saindo');setTimeout(()=>t.remove(),300)};
  // O botão X fecha na hora e o timer fecha sozinho depois de 5 segundos.
  t.querySelector('button').onclick=fechar;c.appendChild(t);setTimeout(fechar,5000);
}

/* Catálogo fake com 15 cidades e 5 voos cada, total de 75 voos sempre iguais */
// Lista de destinos com cidade e estado, 5 cidades por estado.
const CIDADES=[['São Paulo','SP'],['Campinas','SP'],['Santos','SP'],['Ribeirão Preto','SP'],['São José dos Campos','SP'],['Rio de Janeiro','RJ'],['Niterói','RJ'],['Petrópolis','RJ'],['Cabo Frio','RJ'],['Angra dos Reis','RJ'],['Belo Horizonte','MG'],['Uberlândia','MG'],['Ouro Preto','MG'],['Juiz de Fora','MG'],['Poços de Caldas','MG']];
// Companhias aéreas inventadas que se revezam entre os voos.
const CIAS=['Aerovia Brasil','Nuvem Air','Horizonte Linhas Aéreas','Costa Azul Aéreo','Planalto Air'];
// Converte minutos desde a meia noite em texto de hora. O resto por 24 evita passar de 23h59.
const fmtHora=m=>String(Math.floor(m/60)%24).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
// Gera os 75 voos com contas de módulo, então o resultado nunca muda e não tem sorteio.
function gerarVoos(){
  const v=[];
  // i é a posição da cidade e j é o número do voo dentro dela.
  CIDADES.forEach(([cidade,estado],i)=>{for(let j=0;j<5;j++){
    // dur é a duração em minutos e ini é o minuto de partida, de 15 em 15 minutos.
    const dur=55+((i*37+j*23)%125),ini=(5+((i*2+j*4)%17))*60+[0,15,30,45][(i+j*2)%4];
    // Monta o objeto de cada voo com todos os dados e o nome da imagem.
    v.push({id:'f'+(i*5+j+1),cidade,estado,cia:CIAS[(i+j)%5],numero:'VR'+(1000+i*10+j),saida:fmtHora(ini),chegada:fmtHora(ini+dur),durMin:dur,duracao:Math.floor(dur/60)+'h'+String(dur%60).padStart(2,'0'),preco:Math.round((280+((i*53+j*71)%520))/10)*10,assentos:4+((i*7+j*11)%30),imagem:slug(cidade)});
  }});
  return v;
}
// Lê o catálogo salvo e, se não tiver ou estiver incompleto, gera de novo e salva.
function carregarVoos(){let v=ler(K.voos,null);if(!v||v.length<75){v=gerarVoos();gravar(K.voos,v)}return v}

/* Checagem de VIP e aplicação do desconto nos voos */
// Devolve true se a pessoa já ativou o VIP.
const ehVIP=()=>ler(K.vip,false)===true;
// Lê o mapa de descontos salvo na ativação do VIP.
const lerDescontos=()=>ler(K.desc,{});
// Calcula o preço com desconto e arredonda pra duas casas.
const aplicarDesconto=(preco,pct)=>Math.round(preco*(100-pct))/100;
// Monta o preço original, a porcentagem e o preço final. O desconto só vale se for VIP e o voo estiver no mapa de descontos.
function infoPreco(v){const pct=ehVIP()?(lerDescontos()[v.id]||0):0;return{original:v.preco,pct,final:pct?aplicarDesconto(v.preco,pct):v.preco}}

/* Card de voo reutilizável, com links true ele gera links pra outras páginas */
// Monta o HTML do card de um voo. Com links false vêm os botões de ação e com links true vêm os links.
function cartaoHTML(v,links){
  const p=infoPreco(v);
  // Define os botões do card. O Comprar fica desabilitado quando não tem assento.
  const bts=links?`<a class="btn" href="viagens.html?comprar=${v.id}">Comprar Passagem</a><a class="btn btn-sec" href="viagens.html?ver=${v.id}">Ver Detalhes</a>`:`<button class="btn" data-acao="comprar" data-id="${v.id}" ${v.assentos<1?'disabled':''}>Comprar Passagem</button><button class="btn btn-sec" data-acao="ver" data-id="${v.id}">Ver Detalhes</button>`;
  // Estrutura do card com foto, selo VIP, imagem que some se der erro, dados do voo e preço.
  return `<article class="card-v"><div class="foto"><span>${esc(v.cidade)}</span><img src="assets/images/${esc(v.imagem)}.jpg" alt="Vista de ${esc(v.cidade)}" loading="lazy" onerror="this.style.display='none'">${p.pct?`<span class="selo">VIP −${p.pct}%</span>`:''}</div>
  <div class="corpo"><h3>${esc(v.cidade)} — ${esc(v.estado)}</h3><ul class="info"><li>✈️ ${esc(v.cia)} · voo ${esc(v.numero)}</li><li>🕒 ${v.saida} → ${v.chegada} (${v.duracao})</li><li>${v.assentos>0?`💺 ${v.assentos} assentos`:'<strong class="esgotado">Esgotado</strong>'}</li></ul>
  <div class="preco">${p.pct?`<s>${brl(p.original)}</s> <b>${brl(p.final)}</b> <em>−${p.pct}%</em>`:`<b>${brl(p.original)}</b>`}</div><div class="acoes">${bts}</div></div></article>`;
}
// Inicia o básico de toda página, tema, menu ativo, botão de tema e menu do celular.
function iniciarNucleo(){
  carregarTema();
  // Pega o nome do arquivo da página atual.
  const atual=location.pathname.split('/').pop()||'index.html';
  // Marca o link do menu da página atual com aria current pro CSS destacar.
  $$('.nav a').forEach(a=>{if(a.getAttribute('href')===atual)a.setAttribute('aria-current','page')});
  // Clicar no botão alterna entre tema escuro e claro.
  $('#btnTema').onclick=alternarTema;
  // Menu do celular, abre e fecha a navegação e avisa o leitor de tela.
  const mb=$('#menuBtn');mb.onclick=()=>{const o=$('#nav').classList.toggle('open');mb.setAttribute('aria-expanded',o)};
}

/* Parte específica da área VIP com ativação, animação e descontos */
// Porcentagens de desconto possíveis, de 10 a 25.
const PERCENTUAIS=[10,15,20,25];
// Salva true ou false dizendo se o VIP está ativado.
function salvarStatusVIP(b){gravar(K.vip,b)}

/* Sorteio dos descontos entre 10 e 25 por cento em alguns voos */
// Sorteia 20 por cento dos voos pra receber um desconto da lista. Só sorteia uma vez, depois reaproveita o que já está salvo.
function gerarDescontos(){
  let d=lerDescontos();const voos=carregarVoos();
  // Se já tem descontos salvos pra voos existentes, reaproveita e sai.
  if(Object.keys(d).some(id=>voos.some(v=>v.id===id)))return d;
  // Embaralha os voos, pega 20 por cento e sorteia a porcentagem de cada um.
  d={};[...voos].sort(()=>Math.random()-.5).slice(0,Math.round(voos.length*.2)).forEach(v=>{d[v.id]=PERCENTUAIS[Math.floor(Math.random()*PERCENTUAIS.length)]});
  gravar(K.desc,d);return d;
}
// Atualiza a tela conforme o status, cartão dourado, tema VIP no body, textos e botões ligados ou desligados.
function carregarStatusVIP(){
  const on=ehVIP();
  $('#vipCard').classList.toggle('ativo',on);document.body.classList.toggle('vip-on',on);
  $('#vipStatus').textContent=on?'Usuário VIP 👑':'VIP inativo';
  const b=$('#btnVip');b.textContent=on?'VIP Ativo':'Ativar ViagenRNC VIP';b.disabled=on;$('#btnDesativar').hidden=!on;
  if(!on)$('#vipMsg').hidden=true;
  renderizarDescontos();
}
// Se não for VIP mostra o aviso de bloqueio e, se for, mostra os voos com desconto.
function renderizarDescontos(){
  const g=$('#gridVip');
  // Sem VIP mostra o aviso de bloqueio.
  if(!ehVIP()){g.innerHTML='<p class="bloqueado">🔒 Ative o VIP para revelar os voos com desconto.</p>';return}
  // Com VIP pega os voos com desconto, do maior pro menor, e monta os cards.
  const d=gerarDescontos(),l=carregarVoos().filter(v=>d[v.id]).sort((a,b)=>d[b.id]-d[a.id]);
  g.innerHTML=l.map(v=>cartaoHTML(v,true)).join('');
}

/* Animação de ativação com luz, partículas, coroa, barra e mensagem final */
// Animação que dura cerca de 3,6 segundos e devolve uma promessa que resolve no fim.
function animarAtivacaoVIP(){
  return new Promise(ok=>{
    const ov=$('#ativ'),box=$('.ativ-box'),barra=$('#ativBarra'),txt=$('#ativTxt'),luz=$('#luz');
    $$('.part',box).forEach(p=>p.remove());
    // Cria 44 partículas com direção e distância aleatórias, usadas pelas variáveis CSS da animação.
    for(let i=0;i<44;i++){const p=document.createElement('span'),a=Math.random()*6.283,r=120+Math.random()*240;
      p.className='part';p.style.setProperty('--dx',Math.cos(a)*r+'px');p.style.setProperty('--dy',Math.sin(a)*r+'px');p.style.animationDelay=(Math.random()*1.6)+'s';box.appendChild(p)}
    barra.style.transition='none';barra.style.width='0';txt.classList.remove('final');luz.classList.remove('expande');ov.hidden=false;
    // Dois requestAnimationFrame garantem que o navegador desenhe o estado inicial antes de iniciar a barra.
    requestAnimationFrame(()=>requestAnimationFrame(()=>{barra.style.transition='width 2.6s linear';barra.style.width='100%';luz.classList.add('expande')}));
    txt.textContent='Verificando conta…';
    // Os textos de cada etapa trocam em tempos diferentes.
    setTimeout(()=>txt.textContent='Distribuindo descontos…',900);setTimeout(()=>txt.textContent='Liberando benefícios premium…',1800);
    setTimeout(()=>{txt.textContent='VIP ATIVADO COM SUCESSO!';txt.classList.add('final')},2700);
    setTimeout(()=>{ov.hidden=true;ok()},3700);
  });

}
// Ao clicar bloqueia o botão, roda a animação, salva o VIP, atualiza a tela e mostra os toasts.
async function ativarVIP(){
  const btn=$('#btnVip');btn.disabled=true;btn.classList.add('brilho');$('#vipCard').classList.add('ativando');
  await animarAtivacaoVIP();
  gerarDescontos();salvarStatusVIP(true);btn.classList.remove('brilho');$('#vipCard').classList.remove('ativando');
  carregarStatusVIP();$('#vipMsg').hidden=false;
  mostrarToast('Você ativou o modo VIP!','vip');mostrarToast('Desconto VIP aplicado em voos selecionados!','desconto');
}
// Botão de teste pra voltar ao modo normal.
function desativarVIP(){salvarStatusVIP(false);carregarStatusVIP();mostrarToast('VIP desativado.','aviso')}

// Liga os botões de ativar e desativar e inicia a página.
iniciarNucleo();carregarStatusVIP();
$('#btnVip').onclick=ativarVIP;$('#btnDesativar').onclick=desativarVIP;
   