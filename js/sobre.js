// Script da página Sobre do site.
// Conta os números do catálogo, anima a rolagem, destaca o índice e organiza o FAQ.
// O começo é uma versão enxuta do núcleo que as outras páginas também usam.

/* Núcleo compartilhado com dados, tema e menu */
// Nomes das chaves do localStorage, juntos num lugar só pra evitar erro de digitação.
// voos é o catálogo, vip é o status VIP, desc são os descontos, hist são as reservas, tarefas é o planejador, ia é o chat e tema é claro ou escuro.
const K={voos:'vrnc_voos2',vip:'vrnc_vip',desc:'vrnc_desc2',hist:'vrnc_hist2',tarefas:'vrnc_tarefas2',ia:'vrnc_ia2',tema:'vrnc_theme'};
// Lê um valor salvo no localStorage e converte do JSON. Se não existir ou estiver quebrado, devolve o padrão.
const ler=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v===null?d:v}catch(e){return d}};
// Converte o valor pra texto JSON e salva no localStorage.
const gravar=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
// Formata um número como dinheiro em reais.
const brl=n=>Number(n).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
// Atalho pro querySelector.
const $=(s,r=document)=>r.querySelector(s);
// Atalho pro querySelectorAll, já devolvendo array pra poder usar map e filter.
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
// Escapa os caracteres especiais do HTML pra evitar injeção de código. A regex pega os perigosos.
const esc=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Tira os acentos e deixa tudo minúsculo, bom pra busca e comparação.
const norm=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
// Transforma o texto num nome seguro pra arquivo ou URL, ligado por traços. As regex trocam o que não é letra ou número e limpam as pontas.
const slug=s=>norm(s).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

/* Controle do tema claro e escuro */
// Muda o ícone do botão, sol no tema escuro e lua no claro.
function atualizarBotaoTema(){const b=$('#btnTema');if(b)b.textContent=document.documentElement.dataset.theme==='dark'?'☀️':'🌙'}
// Aplica o tema salvo no atributo data theme do html.
function carregarTema(){document.documentElement.dataset.theme=localStorage.getItem(K.tema)||'light';atualizarBotaoTema()}
// Inverte o tema, salva a escolha e aplica de novo. Vale pra todas as páginas.
function alternarTema(){localStorage.setItem(K.tema,document.documentElement.dataset.theme==='dark'?'light':'dark');carregarTema()}

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

// Inicia o básico de toda página, tema, menu ativo, botão de tema e menu do celular.
function iniciarNucleo(){
  carregarTema();
  // Pega o nome do arquivo da página atual.
  const atual=location.pathname.split('/').pop()||'index.html';
  // Marca o link do menu da página atual com aria current pro CSS destacar.
  $$('.nav a').forEach(a=>{if(a.getAttribute('href')===atual)a.setAttribute('aria-current','page')});
  // Clicar no botão alterna o tema.
  $('#btnTema').onclick=alternarTema;
  // Menu hambúrguer do celular, abre e fecha a navegação e avisa o leitor de tela.
  const mb=$('#menuBtn');mb.onclick=()=>{const o=$('#nav').classList.toggle('open');mb.setAttribute('aria-expanded',o)};
}

/* Parte específica da página Sobre com números, animação de rolagem, índice e FAQ */

// Vira true se a pessoa pediu menos movimento no sistema, aí as animações são puladas.
const menosMovimento=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Calcula os números do site direto do catálogo pra nunca ficarem desatualizados.
function calcularNumeros(){
  const v=carregarVoos();
  return{
    voos:v.length,
    cidades:new Set(v.map(x=>x.cidade)).size,   // O Set tira os repetidos e sobra um por cidade.
    estados:new Set(v.map(x=>x.estado)).size,
    cias:new Set(v.map(x=>x.cia)).size
  };
}

// Anima um número subindo de zero até o valor final em mais ou menos um segundo.
function animarNumero(el,fim){
  if(menosMovimento||fim<2){el.textContent=fim;return}
  const inicio=performance.now(),duracao=1000;
  const passo=agora=>{
    const t=Math.min((agora-inicio)/duracao,1);              // Progresso da animação indo de 0 a 1.
    el.textContent=Math.round(fim*(1-Math.pow(1-t,3)));       // Sobe rápido e vai desacelerando no final.
    if(t<1)requestAnimationFrame(passo);
  };
  requestAnimationFrame(passo);
}

// Prepara os contadores pra começarem a contar só quando aparecem na tela.
function iniciarContadores(){
  const n=calcularNumeros();
  const obs=new IntersectionObserver((itens,o)=>{
    itens.forEach(i=>{
      if(!i.isIntersecting)return;
      animarNumero(i.target,n[i.target.dataset.conta]);
      o.unobserve(i.target);                                  // Depois de contar para de observar, então conta uma vez só.
    });
  },{threshold:.6});
  $$('[data-conta]').forEach(el=>obs.observe(el));
}

// Monta a frase da conta do visitante com reservas e VIP lidos do localStorage.
function mostrarSuaConta(){
  const reservas=ler(K.hist,[]).length,vip=ler(K.vip,false)===true;
  const r=reservas===0?'Você ainda não fez nenhuma reserva simulada.':reservas===1?'Você tem 1 reserva simulada.':`Você tem ${reservas} reservas simuladas.`;
  $('#suaConta').textContent=`${r} ${vip?'Seu VIP está ativo. 👑':'O VIP está desativado.'}`;
}

// Faz cada bloco aparecer suave quando chega na tela.
function iniciarAparecer(){
  const blocos=$$('.reveal');
  if(menosMovimento||!('IntersectionObserver' in window)){blocos.forEach(b=>b.classList.add('visivel'));return}
  const obs=new IntersectionObserver((itens,o)=>{
    itens.forEach(i=>{if(i.isIntersecting){i.target.classList.add('visivel');o.unobserve(i.target)}});
  },{threshold:.12});
  blocos.forEach(b=>obs.observe(b));
}

// Destaca no índice o link da seção que está no topo da tela.
function iniciarIndice(){
  const links=$$('.sobre-indice a');
  const obs=new IntersectionObserver(itens=>{
    itens.forEach(i=>{
      if(!i.isIntersecting)return;
      links.forEach(a=>a.classList.toggle('ativo',a.getAttribute('href')==='#'+i.target.id));
    });
  },{rootMargin:'-30% 0px -60% 0px'});                        // Só vale a faixa perto do topo da tela.
  links.forEach(a=>{const s=$(a.getAttribute('href'));if(s)obs.observe(s)});
}

// FAQ que fecha as outras perguntas quando uma abre.
function iniciarFaq(){
  const itens=$$('#faq details');
  itens.forEach(d=>d.addEventListener('toggle',()=>{
    if(d.open)itens.forEach(o=>{if(o!==d)o.open=false});
  }));
}

// Ponto de partida que roda tudo quando a página carrega.
iniciarNucleo();
document.documentElement.classList.add('js');   // Avisa o CSS que o JS está funcionando.
mostrarSuaConta();iniciarAparecer();iniciarContadores();iniciarIndice();iniciarFaq();
