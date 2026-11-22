/* Apolo, o golden da casa.
   Anda pelo chão da página, segue o cursor no computador, atende ao toque no
   celular, reage aos presentes e solta umas fofocas.

   O desenho veio do Apolo do Controle Financeiro. A mecânica foi refeita para
   ficar fluida:
   · tudo anda por tempo (px/s), não por quadro: mesma velocidade em tela de 60 ou 120 Hz;
   · o corpo acelera e freia, nada de começar ou parar no tranco;
   · as patas avançam conforme a distância percorrida, então não deslizam no chão;
   · passo, trote e galope se misturam aos poucos, sem reiniciar o ciclo;
   · sentar, deitar, virar, pular e olhar são molas que se combinam a qualquer momento;
   · orelha e rabo têm movimento secundário: balançam atrasados, como pelo de verdade. */
window.Apolo = (function () {
  "use strict";
  var nada = function () {};
  var raiz = document.getElementById("apolo");
  if (!raiz || !raiz.querySelector("svg")) {
    return { falar: nada, humor: nada, abrirPresente: nada, fecharPresente: nada, comemorar: nada, retrato: nada };
  }

  function mq(q) { try { return window.matchMedia(q).matches; } catch (e) { return false; } }
  var reduz = mq("(prefers-reduced-motion: reduce)");
  var temCursor = mq("(hover: hover) and (pointer: fine)");

  function lim(v, a, b) { return v < a ? a : v > b ? b : v; }
  function mis(a, b, k) { return a + (b - a) * k; }
  function suave(a, b, v) { var k = lim((v - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); }
  function aprox(v, alvo, taxa, dt) { return v + (alvo - v) * (1 - Math.exp(-taxa * dt)); }
  function agora() { return performance.now() / 1000; }
  function n(v) { return Math.round(v * 100) / 100; }
  function n4(v) { return Math.round(v * 10000) / 10000; }

  // Mola amortecida: freq em Hz, amort 1 = sem passar do ponto, menor = balança
  function Mola(v, freq, amort) { this.x = this.alvo = v; this.v = 0; this.w = 2 * Math.PI * freq; this.z = amort; }
  Mola.prototype.passo = function (dt) {
    this.v += (this.w * this.w * (this.alvo - this.x) - 2 * this.z * this.w * this.v) * dt;
    this.x += this.v * dt;
  };
  Mola.prototype.fixar = function (v) { this.x = this.alvo = v; this.v = 0; };

  /* ---------- Desenho ---------- */
  // Coordenadas no viewBox 0 0 130 104, cachorro virado para a direita
  function partes(svg) {
    var q = function (s) { return svg.querySelector(s); };
    return {
      sombra: q(".a-sombra"), rabo: q(".a-rabo"), tronco: q(".a-tronco"), cabeca: q(".a-cabeca"),
      orelha: q(".a-orelha"), palpebra: q(".a-palpebra"), lingua: q(".a-lingua"), sobrancelha: q(".a-sobrancelha"),
      // Trote: pares diagonais. Galope: dianteiras juntas, traseiras juntas.
      // Cada pata tem dois segmentos: a perna gira no ombro/quadril e a pata no punho/jarrete.
      // senta / deita: [giro, esticar a perna, desloca x, desloca y, giro da pata].
      // Sentado, as patas da frente ficam plantadas onde estavam; deitado, as patas apoiam no chão.
      patas: [
        pata(".a-pata-tl", { x: 36.5, frente: false, trote: Math.PI, galope: Math.PI, senta: [-70, .6, -4, 19.2, 70], deita: [10, .35, 0, 16.4, -10] }),
        pata(".a-pata-fl", { x: 80.5, frente: true, trote: 0, galope: 0, senta: [-14, 1.06, -8.4, -.4, 14], deita: [-80, .8, 0, 20.7, 80] }),
        pata(".a-pata-tp", { x: 46.5, frente: false, trote: 0, galope: Math.PI + .55, senta: [-70, .6, -5, 19.2, 70], deita: [10, .35, 0, 16.4, -10] }),
        pata(".a-pata-fp", { x: 90.5, frente: true, trote: Math.PI, galope: .55, senta: [-14, 1.25, -9.4, -4.8, 14], deita: [-80, .8, 0, 20.7, 80] })
      ]
    };
    function pata(sel, o) { o.el = q(sel); o.cima = o.el.querySelector(".a-cima"); o.baixo = o.el.querySelector(".a-baixo"); return o; }
  }

  // Aplica uma pose no desenho (serve para o Apolo vivo e para o retrato).
  // Sentado: o quadril desce até o chão, o peito sobe, as patas de trás dobram
  // para a frente e o rabo vai junto com o quadril.
  function posar(P, e, ajuste) {
    if (ajuste) for (var k in ajuste) e[k] = ajuste[k];
    var se = e.sentado, de = e.deitado;
    var em = Math.max(0, 1 - se - de);   // peso da pose "em pé"
    P.tronco.setAttribute("transform",
      "translate(0 " + n(e.bob * em + 20 * se + 16 * de) + ")" +
      " rotate(" + n(-26 * se + e.inclina) + " 32 72)" +
      " rotate(" + n(e.pitch * em + 3 * de) + " 60 57)" +
      " translate(60 64) scale(" + n4(e.respX) + " " + n4(e.respY) + ") translate(-60 -64)");
    for (var i = 0; i < 4; i++) {
      var p = P.patas[i], f = p.frente, S = p.senta, D = p.deita;
      var flexao = e.flexoes ? e.flexoes[i] : 0;
      var rot = em * e.passos[i] + se * S[0] + de * D[0] + e.noAr * (f ? -30 : 32);
      var sy = em + se * S[1] + de * D[1] - (f ? e.inclina * .02 : 0);
      var tx = se * S[2] + de * D[2], ty = se * S[3] + de * D[3];
      p.el.setAttribute("transform", "translate(" + n(tx) + " " + n(ty) + ") rotate(" + n(rot) + " " + p.x + " 64)");
      // Só a perna estica ou encolhe; a pata acompanha a ponta dela e mantém o tamanho
      p.cima.setAttribute("transform", "translate(0 " + n(63 * (1 - sy)) + ") scale(1 " + n4(sy) + ")");
      var rotB = em * flexao + se * S[4] + de * D[4] + e.noAr * (f ? 34 : -24);
      p.baixo.setAttribute("transform", "translate(0 " + n(25 * (sy - 1)) + ") rotate(" + n(rotB) + " " + p.x + " 88)");
    }
    // A cabeça compensa o giro do corpo: sentado, ele continua olhando para frente
    P.cabeca.setAttribute("transform", "rotate(" + n(e.cabeca + 26 * se - 3 * de) + " 88 50)");
    P.orelha.setAttribute("transform", "rotate(" + n(e.orelha) + " 89 26)");
    P.palpebra.setAttribute("transform", "translate(104 29.2) scale(1 " + n4(Math.max(.001, e.palpebra)) + ") translate(-104 -29.2)");
    P.lingua.setAttribute("transform", "translate(117 46) scale(1 " + n4(Math.max(.001, e.lingua)) + ") translate(-117 -46)");
    // Sobrancelha: franze ao julgar, ergue na ressalva
    P.sobrancelha.setAttribute("transform", "rotate(" + n(e.sobrancelha || 0) + " 103.7 27.6) translate(0 " + n((e.sobrancelha || 0) * .04) + ")");
    // Rabo preso ao quadril: sentado ou deitado, ele varre o chão
    P.rabo.setAttribute("transform", "translate(" + n(-9.6 * se) + " " + n(20.2 * se + 16 * de) + ") rotate(" + n(e.rabo - 46 * se - 38 * de) + " 32 50)");
    P.sombra.setAttribute("transform", "translate(" + n(-8 * se) + " " + n(e.sombraY) + ") translate(62 99) scale(" + n4(e.sombraK) + " 1) translate(-62 -99)");
  }

  var P = partes(raiz.querySelector("svg"));
  var corpo = raiz.querySelector(".apolo-corpo"), botao = raiz.querySelector(".apolo-toque");
  var elBalao = document.getElementById("apolo-balao"), miolo = elBalao && elBalao.querySelector(".balao-miolo");
  var elZzz = document.getElementById("apolo-zzz"), elPano = document.getElementById("apolo-pano");

  /* ---------- Medidas ---------- */
  var W, LARG, U, CHAO;
  function medir() {
    W = window.innerWidth;
    LARG = raiz.offsetWidth || 110; U = LARG / 130;
    CHAO = raiz.getBoundingClientRect().bottom;
  }
  medir();

  /* ---------- Estado ---------- */
  var inicio = agora();
  var x = -LARG - 40, v = 0, alvoX = Math.min(W * .28, 340), velMax = 220, aceS = 0;
  var face = new Mola(1, 3, 1), sentado = new Mola(0, 1.8, 1), deitado = new Mola(0, 1.3, 1);
  var cab = new Mola(0, 2.4, .8), ore = new Mola(0, 2.1, .18), estica = new Mola(1, 3.4, .3);
  var palp = 0, ling = 0, alegria = .5, cansaco = 0, inclina = 0, sobr = 0, ritmo = 0;
  var fase = 0, faseRabo = 0, faseResp = 0, y = 0, vy = 0, pulo = null;
  var modo = "livre", quadro = null, itemAtual = null, humorQuadro = "neutro", humorPasse = null, reagiu = false;
  var mouse = { x: 0, y: 0, t: -99 }, chamado = null, ultimaAcao = inicio;
  var proxPasseio = inicio + 5, piscaAte = 0, proxPisca = inicio + 2.5, linguaAte = 0;
  var pano = null, falaPendente = null, faceForcada = 0, saudou = false, dtAtual = 0;
  var proxFarejo = inicio + 7, farejaAte = 0;

  function acao() { ultimaAcao = agora(); }

  /* ---------- Fala ---------- */
  var FOFOCAS = [
    "Eu vi quem ainda não fez o Pix.",
    "Tô de olho.",
    "Eu não como pano de chão. É o pano que se joga na minha boca.",
    "Pode clicar à vontade. Eu anoto tudo.",
    "Fiquei sabendo de umas coisas no almoço. Depois eu conto.",
    "A Bianca já sabe onde vai cada presente. Ela é arquiteta.",
    "Não conto quem escolheu a faculdade. Ainda."
  ];
  var ordemFofocas = [];
  function fofoca() {
    if (!ordemFofocas.length) {
      ordemFofocas = FOFOCAS.slice();
      for (var i = ordemFofocas.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = ordemFofocas[i]; ordemFofocas[i] = ordemFofocas[j]; ordemFofocas[j] = t; }
    }
    return ordemFofocas.pop();
  }

  var balaoAte = 0, bw = 0, bh = 0, timerBalao, balaoLado = 0;
  function falar(texto, dur) {
    if (!elBalao || !texto) return;
    miolo.textContent = texto;
    elBalao.classList.add("visivel");
    medirBalao();
    // Tempo de leitura: cerca de 11 letras por segundo, nunca menos de 4 s
    balaoAte = agora() + (dur || lim(2 + texto.length * .09, 4, 7.5));
    posicionarBalao();
    clearTimeout(timerBalao);
    if (reduz) timerBalao = setTimeout(esconderBalao, (balaoAte - agora()) * 1000);
  }
  function esconderBalao() { balaoAte = 0; if (elBalao) elBalao.classList.remove("visivel"); }
  function topoCabeca() {
    var r = P.cabeca.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top };
  }
  // Com um quadro aberto, onde sobra espaço para o balão: à esquerda do quadro
  // (computador) ou na faixa livre embaixo dele (celular).
  function vaga() {
    if (!quadro || modo !== "presente") return null;
    var q = quadro.getBoundingClientRect();
    if (q.left > LARG + 40) return { dir: q.left - 12 };
    return { topo: q.bottom + 6 };
  }
  function medirBalao() {
    var g = vaga(), r = P.cabeca.getBoundingClientRect();
    balaoLado = 0;
    elBalao.classList.remove("lado", "lado-esq");
    elBalao.style.maxWidth = g && g.dir ? Math.min(270, Math.max(150, g.dir - 10)) + "px" : "";
    bw = elBalao.offsetWidth; bh = elBalao.offsetHeight;
    if (g && g.topo && r.top - bh - 10 < g.topo) {
      // Não cabe em cima da cabeça sem cobrir o quadro: vai para o lado da cabeça
      balaoLado = W - r.right >= r.left ? 1 : -1;
      elBalao.classList.add("lado");
      if (balaoLado < 0) elBalao.classList.add("lado-esq");
      var esp = balaoLado > 0 ? W - r.right - 24 : r.left - 24;
      elBalao.style.maxWidth = Math.min(270, Math.max(140, esp)) + "px";
      bw = elBalao.offsetWidth; bh = elBalao.offsetHeight;
    }
  }
  function posicionarBalao() {
    var r = P.cabeca.getBoundingClientRect(), g = vaga(), bx, by;
    if (balaoLado) {
      var ay = r.top + r.height * .4;
      bx = lim(balaoLado > 0 ? r.right + 12 : r.left - 12 - bw, 10, W - bw - 10);
      by = lim(ay - bh / 2, g && g.topo ? g.topo : 10, window.innerHeight - bh - 8);
      elBalao.style.setProperty("--seta", n(lim(ay - by, 14, bh - 14)) + "px");
    } else {
      var cx = r.left + r.width / 2, dir = g && g.dir ? g.dir : W - 10;
      bx = lim(cx - bw / 2, 10, Math.max(10, dir - bw)); by = r.top - bh - 10;
      elBalao.style.setProperty("--seta", n(lim(cx - bx, 18, bw - 18)) + "px");
    }
    elBalao.style.transform = "translate3d(" + n(bx) + "px," + n(by) + "px,0)";
  }
  function posicionarZzz() {
    var c = topoCabeca(), fs = face.x >= 0 ? 1 : -1;
    elZzz.style.transform = "translate3d(" + n(c.x + fs * 10 * U - 6) + "px," + n(c.y - 26) + "px,0)";
  }

  /* ---------- Sono ---------- */
  function dormir() {
    if (modo === "dormindo") return;
    modo = "dormindo";
    if (elZzz) elZzz.classList.add("visivel");
  }
  function acordar(falando) {
    if (modo !== "dormindo") return;
    modo = quadro ? "presente" : "livre";
    if (elZzz) elZzz.classList.remove("visivel");
    acao(); proxPasseio = agora() + 3; estica.v += 2;
    if (falando) falar("Eu não estava dormindo.");
  }

  /* ---------- Pulo: agacha, sobe, cai e amortece ---------- */
  function pular(forca) {
    if (reduz || modo === "dormindo" || y > 0 || pulo) return;
    pulo = { em: agora() + .09, forca: forca || 480 };
    estica.v -= 4;
  }

  /* ---------- Humor ---------- */
  function humorNa(I, h) {
    if (h === "aprova") { I.alegria = 1; I.cabeca -= 6; }
    else if (h === "julga") { I.alegria = .04; I.palp = 1.15; I.cabeca += 9; I.sobr = 16; }   // olhar de julgador
    else if (h === "nega") { I.alegria = .2; I.palp = .9; I.cabeca -= 10; I.sobr = 8; }
    else if (h === "ressalva") { I.alegria = .12; I.palp = .55; I.cabeca += 13; I.orelha = 12; I.sobr = -14; }
    else if (h === "fofoca") { I.alegria = .75; I.palp = .65; I.sobr = -8; }
    else if (h === "pano") { I.alegria = 1; }
    else { I.alegria = Math.max(I.alegria, .55); }
  }
  function reagir(T) {
    var it = itemAtual;
    if (!it || it.humor === "pano") return;
    var pausa = (it.humor === "julga" || it.humor === "nega" || it.humor === "ressalva") ? .6 : .25;
    falaPendente = { texto: it.fala, em: T + pausa };
    if (it.humor === "aprova") pular(360);
  }

  /* ---------- Pano de chão: cai do quadro, o Apolo corre e come ---------- */
  var PW = 40, PH = 26;
  function soltarPano(caixa, fala) {
    var r = caixa.getBoundingClientRect();
    // Computador: escorrega pela borda esquerda do quadro e cai no chão livre,
    // onde o Apolo come e fala sem ficar atrás do quadro.
    var esquerda = r.left > LARG + 40 + PW;
    pano = {
      fase: "caindo", fala: fala, t: agora(), lado: esquerda ? 1 : 0,
      x: esquerda ? r.left - PW / 2 : lim(r.left + r.width * .72 - PW / 2, 12, W - PW - 12), y: r.bottom - PH - 8,
      vx: esquerda ? -170 : 0, vy: -160, rot: -10, vr: 150, esc: 1
    };
    if (elPano) elPano.classList.add("visivel");
  }
  function passoPano(T, I, cx) {
    var s = pano, dt = dtAtual, piso = CHAO - 5 * U - PH, pcx = s.x + PW / 2;
    if (s.fase === "caindo") {
      s.vy += 1400 * dt; s.y += s.vy * dt; s.rot += s.vr * dt; s.vr *= Math.exp(-dt * 1.5);
      s.x += (s.vx + Math.sin((T - s.t) * 6) * 30) * dt;   // balança no ar, como pano
      s.vx *= Math.exp(-dt * 1.2); s.x = lim(s.x, 12, W - PW - 12);
      if (s.y >= piso) { s.y = piso; s.fase = "chao"; s.rot = 6; }
    }
    I.olhar = { x: pcx, y: s.y + PH / 2 }; I.orelha = 20; I.alegria = .9;

    if ((s.fase === "caindo" || s.fase === "chao") && T - s.t > .35) {
      if (!s.lado) s.lado = pcx >= cx ? 1 : -1;
      alvoX = pcx - s.lado * 48 * U - LARG / 2; velMax = 650;
      if (s.fase === "chao" && Math.abs(alvoX - x) < 6 && Math.abs(v) < 40) { s.fase = "comendo"; s.tc = T; }
    }
    if (s.fase === "comendo") {
      faceForcada = s.lado; alvoX = x;
      var k = T - s.tc;
      I.cabecaFixa = 50 + 6 * Math.sin(k * 15); I.inclina = 10; I.alegria = 1;
      s.esc = lim(1 - Math.floor(k / .5) * .34, 0, 1);
      if (k > 1.55) {
        s.fase = "fim"; s.tf = T; s.esc = 0;
        if (elPano) elPano.classList.remove("visivel");
        linguaAte = T + 1.6;
        falar(s.fala || "Que pano?");
      }
    }
    if (s.fase === "fim") {
      faceForcada = s.lado; alvoX = x; I.sentar = 1; I.alegria = 1;
      if (quadro) { var q = quadro.getBoundingClientRect(); I.olhar = { x: q.left + q.width / 2, y: q.top + 50 }; }
      else I.olhar = null;
      if (T - s.tf > 1.6) { pano = null; acao(); }
    }
    if (elPano && s.fase !== "fim") {
      elPano.style.transform = "translate3d(" + n(s.x) + "px," + n(s.y) + "px,0) rotate(" + n(s.rot) + "deg) scale(" + n4(s.esc) + ")";
    }
    return I;
  }

  /* ---------- Decisão: para onde ir, para onde olhar, que pose fazer ---------- */
  function decidir(T) {
    var cx = x + LARG / 2;
    var I = { sentar: 0, deitar: 0, alegria: .45, palp: 0, cabeca: 0, cabecaFixa: null, orelha: 0, olhar: null, inclina: 0, sobr: 0 };
    faceForcada = 0;

    if (pano) return passoPano(T, I, cx);

    if (modo === "dormindo") {
      I.deitar = 1; I.palp = 2; I.alegria = .06; I.cabeca = 14; alvoX = x;
      return I;
    }

    if (modo === "presente" && quadro) {
      var q = quadro.getBoundingClientRect(), qcx = q.left + q.width / 2;
      // Computador: vai para o meio do espaço livre à esquerda do quadro.
      // Celular: senta embaixo do quadro, no canto esquerdo.
      alvoX = q.left > LARG + 40 ? lim((q.left - LARG) / 2, 16, q.left - LARG - 14) : lim(q.left + 4, 4, W - LARG - 4);
      velMax = 600;
      I.olhar = { x: qcx, y: q.top + 50 };
      if (Math.abs(alvoX - x) < 8 && Math.abs(v) < 40) {
        I.sentar = 1;
        // Só fala depois de chegar e sentar
        if (!reagiu && sentado.x > .7) { reagiu = true; reagir(T); }
        humorNa(I, humorQuadro);
        if (humorQuadro === "nega" && T > falaPendenteEm()) {
          // "Não fui eu": vira de costas e olha para o outro lado
          faceForcada = qcx > cx ? -1 : 1;
          I.olhar = { x: cx + faceForcada * 300, y: CHAO - 260 };
        }
      }
      return I;
    }

    // Livre
    if (temCursor && T - mouse.t < 9) {
      alvoX = lim(mouse.x - LARG / 2, -10, W - LARG + 10); velMax = 600; I.olhar = mouse;
      // Cursor bem em cima dele: senta e abana. Cursor rente ao chão: deita.
      // Enquanto o cursor ficar nessa faixa, ele fica na pose (não persegue).
      var alinhado = Math.abs(mouse.x - cx) < 70 && Math.abs(v) < 60;
      if (alinhado && mouse.y < CHAO - 170) { I.sentar = 1; I.alegria = 1; alvoX = x; }
      else if (alinhado && mouse.y >= CHAO - 110) { I.deitar = 1; I.alegria = .7; alvoX = x; }
    } else if (chamado) {
      alvoX = lim(chamado.x - LARG / 2, -10, W - LARG + 10); velMax = 600; I.olhar = chamado;
      if (Math.abs(alvoX - x) < 8 && Math.abs(v) < 40) {
        I.sentar = 1; I.alegria = 1;
        if (!chamado.chegou) chamado.chegou = T;
        else if (T - chamado.chegou > 3.5) chamado = null;
      }
    } else {
      // Passeio sozinho; parado muito tempo, senta; depois dorme
      velMax = 150; I.alegria = .35;
      var parado = T - ultimaAcao;
      if (parado > 20) {
        alvoX = x;
        if (Math.abs(v) < 5) I.sentar = 1;
        if (parado > 40 && sentado.x > .8) dormir();
      } else if (T > proxPasseio) {
        alvoX = 16 + Math.random() * Math.max(20, W - LARG - 32);
        proxPasseio = T + 6 + Math.random() * 7;
      }
      if (parado <= 20 && Math.abs(v) < 12 && T > proxFarejo) { farejaAte = T + 1.6; proxFarejo = T + 5 + Math.random() * 6; }
      if (T < farejaAte) { alvoX = x; I.cabecaFixa = 34 + 2.5 * Math.sin(T * 26); I.orelha = 5; I.alegria = .5; }
    }
    if (humorPasse) humorNa(I, humorPasse);
    return I;
  }
  function falaPendenteEm() { return falaPendente ? falaPendente.em : 0; }

  /* ---------- Quadro a quadro ---------- */
  var passos = [0, 0, 0, 0], flexoes = [0, 0, 0, 0], ultimo = agora();
  function quadroAnim() {
    var T = agora(), dt = Math.min(1 / 30, Math.max(0, T - ultimo)); ultimo = T; dtAtual = dt;
    var I = decidir(T), cx = x + LARG / 2;

    // Pose: para andar, primeiro levanta
    var precisaAndar = Math.abs(alvoX - x) > 14;
    sentado.alvo = precisaAndar ? 0 : I.sentar;
    deitado.alvo = precisaAndar ? 0 : I.deitar;
    sentado.passo(dt); deitado.passo(dt);

    // Locomoção: acelera até a velocidade desejada e freia ao chegar
    var travado = sentado.x > .3 || deitado.x > .3 || (pano && pano.fase === "comendo");
    var dist = alvoX - x, vAnt = v;
    var desejada = travado ? 0 : lim(dist * 2.6, -velMax, velMax);
    v += lim((desejada - v) * 8, -2600, 2600) * dt;
    x += v * dt;
    if (!travado && Math.abs(dist) < 1 && Math.abs(v) < 10) v = 0;
    var fs = face.x >= 0 ? 1 : -1;
    aceS = aprox(aceS, (v - vAnt) / Math.max(dt, 1e-3) * fs, 10, dt);
    var s = lim(Math.abs(v) / 600, 0, 1);

    // Virar: para onde anda; parado, para onde olha
    var fAlvo = face.alvo;
    if (faceForcada) fAlvo = faceForcada;
    else if (Math.abs(v) > 30) fAlvo = v > 0 ? 1 : -1;
    else if (I.olhar && Math.abs(I.olhar.x - cx) > 45) fAlvo = I.olhar.x > cx ? 1 : -1;
    face.alvo = fAlvo; face.passo(dt);

    // Marcha: o ciclo das patas avança com a distância percorrida
    fase += Math.abs(v) * dt / (U * mis(46, 118, s)) * Math.PI * 2;
    var gal = suave(.55, .9, s), amp = 34 * suave(0, .45, s);
    var dobra = suave(0, .3, s);
    for (var i = 0; i < 4; i++) {
      var p = P.patas[i], ph = fase + mis(p.trote, p.galope, gal);
      passos[i] = amp * Math.sin(ph);
      flexoes[i] = Math.max(0, -Math.cos(ph)) * dobra * (p.frente ? 42 : -26);
    }

    // Cansaço, respiração e língua de fora depois de correr
    cansaco = lim(cansaco + (s > .6 ? .32 : -.1) * dt, 0, 1);
    var ofeg = modo === "dormindo" ? 0 : suave(.25, .8, cansaco);
    faseResp += dt * Math.PI * 2 * (modo === "dormindo" ? .22 : mis(.32, 2.7, ofeg));
    var resp = Math.sin(faseResp);
    ling = aprox(ling, (ofeg > .2 || T < linguaAte) ? 1 : 0, 6, dt);

    // Pulo
    if (pulo && T >= pulo.em) { vy = pulo.forca; estica.v += 5; pulo = null; }
    if (y > 0 || vy > 0) {
      vy -= 2300 * dt; y += vy * dt;
      if (y <= 0) { y = 0; if (vy < -120) estica.v -= Math.min(7, -vy / 110); vy = 0; }
    }
    estica.passo(dt);
    var noAr = suave(0, 24, y);

    // Cabeça segue o olhar, com limite de pescoço
    var alvoCab = 0;
    if (I.olhar) {
      var se = lim(sentado.x, 0, 1), de = lim(deitado.x, 0, 1);
      var hx = cx + (33 - 22 * se) * U * fs, hy = CHAO - (67 + 5 * se - 16 * de) * U - y;
      var dxl = fs > 0 ? I.olhar.x - hx : hx - I.olhar.x;
      alvoCab = lim(Math.atan2(I.olhar.y - hy, Math.max(dxl, 60)) * 180 / Math.PI, -24, 24);
    }
    alvoCab += I.cabeca;
    if (I.cabecaFixa !== null) alvoCab = I.cabecaFixa;
    cab.alvo = alvoCab; cab.passo(dt);

    // Orelha: balança com a aceleração, a corrida, o pulo e o giro da cabeça
    ore.alvo = lim(aceS * .012 + s * 14 - cab.v * .05 + I.orelha - vy * .012, -28, 40);
    ore.passo(dt);

    // Rabo: mais alto e mais rápido quanto mais feliz; para trás na corrida
    // Com música, ele fica mais animado e, parado, balança a cabeça no ritmo
    var comMusica = !!(window.Musica && Musica.ligada()) && modo !== "dormindo";
    var balancaCabeca = comMusica && !pano && I.cabecaFixa === null && Math.abs(v) < 25 && y === 0;
    ritmo = aprox(ritmo, balancaCabeca ? 1 : 0, 4, dt);
    var nod = ritmo ? ritmo * 4.5 * Math.sin(Musica.batida() * Math.PI * 2) : 0;
    alegria = aprox(alegria, comMusica && modo === "livre" ? Math.max(I.alegria, .7) : I.alegria, 2.5, dt);
    faseRabo += dt * Math.PI * 2 * mis(.5, 3.8, alegria);
    var rabo = mis(-10, 4, alegria) + Math.sin(faseRabo) * mis(5, 24, alegria) - 16 * s;

    // Piscar
    if (T > proxPisca) { piscaAte = T + .11; proxPisca = T + 2.5 + Math.random() * 4; }
    palp = aprox(palp, Math.max(I.palp, T < piscaAte ? 2 : 0), T < piscaAte ? 40 : 14, dt);
    inclina = aprox(inclina, I.inclina, 8, dt);
    sobr = aprox(sobr, I.sobr, 9, dt);

    // Desenha
    raiz.style.transform = "translate3d(" + n(x) + "px,0,0)";
    var largo = 1 + (1 - estica.x) * .6;   // achata ao cair, alonga ao subir
    corpo.style.transform = "translate3d(0," + n(-y) + "px,0) scale(" + n4(face.x * largo) + "," + n4(estica.x) + ")";
    posar(P, {
      sentado: lim(sentado.x, 0, 1), deitado: lim(deitado.x, 0, 1),
      bob: -Math.abs(Math.sin(fase)) * mis(0, 2.8, s),
      pitch: Math.sin(fase) * 4 * gal + lim(-vy / 600, -1, 1) * 9 * noAr,
      inclina: inclina, respX: 1 + resp * .006 * (1 + ofeg), respY: 1 + resp * .02 * (1 + ofeg * .6),
      passos: passos, flexoes: flexoes, noAr: noAr, cabeca: cab.x + nod, orelha: ore.x - nod * .6, palpebra: palp, sobrancelha: sobr,
      lingua: ling * (.84 + .16 * Math.sin(faseResp * 2)), rabo: rabo,
      sombraY: y / U, sombraK: 1 - lim(y / 140, 0, .45)
    });

    // Falas e balão
    if (!saudou && modo === "livre" && T - inicio > 1.8) {
      saudou = true;
      falar(temCursor ? "Oi, eu sou o Apolo. Estou de olho nas suas escolhas." : "Oi, eu sou o Apolo. Pode me cutucar.");
    }
    if (falaPendente && T >= falaPendente.em) { falar(falaPendente.texto); falaPendente = null; }
    if (balaoAte && T > balaoAte) esconderBalao();
    if (balaoAte) posicionarBalao();
    if (modo === "dormindo" && elZzz) posicionarZzz();

    requestAnimationFrame(quadroAnim);
  }

  /* ---------- Entradas ---------- */
  window.addEventListener("pointermove", function (e) {
    if (e.pointerType !== "mouse") return;
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.t = agora(); temCursor = true;
    acao(); acordar(false);
  }, { passive: true });
  document.documentElement.addEventListener("mouseleave", function () { mouse.t = -99; });

  // Celular: um toque rápido num espaço vazio chama o Apolo até lá
  var toqueIni = null;
  window.addEventListener("pointerdown", function (e) {
    if (e.pointerType === "mouse") return;
    toqueIni = { x: e.clientX, y: e.clientY, t: performance.now() };
  }, { passive: true });
  window.addEventListener("pointercancel", function () { toqueIni = null; }, { passive: true });
  window.addEventListener("pointerup", function (e) {
    if (e.pointerType === "mouse" || !toqueIni) return;
    var d = Math.hypot(e.clientX - toqueIni.x, e.clientY - toqueIni.y), dur = performance.now() - toqueIni.t;
    toqueIni = null;
    if (d > 12 || dur > 450) return;
    if (e.target.closest && e.target.closest("button, a, input, textarea, .modal, .cartao")) return;
    if (modo === "presente" || pano) return;
    acordar(false);
    chamado = { x: e.clientX, y: e.clientY, chegou: 0 };
    acao();
  }, { passive: true });

  window.addEventListener("scroll", function () { if (modo !== "dormindo") acao(); }, { passive: true });

  botao.addEventListener("click", function () {
    if (modo === "dormindo") { acordar(true); return; }
    acao(); alegria = 1; pular(500);
    falar(fofoca());
  });

  var esperaResize;
  window.addEventListener("resize", function () {
    clearTimeout(esperaResize);
    esperaResize = setTimeout(function () {
      medir();
      x = lim(x, -10, W - LARG + 10); alvoX = lim(alvoX, -10, W - LARG + 10);
      if (reduz) desenharParado();
    }, 100);
  });

  /* ---------- Sem animação (reduzir movimento): sentado num canto ---------- */
  function desenharParado() {
    x = 16;
    raiz.style.transform = "translate3d(16px,0,0)";
    posar(P, {
      sentado: 1, deitado: 0, bob: 0, pitch: 0, inclina: 0, respX: 1, respY: 1, passos: [0, 0, 0, 0],
      noAr: 0, cabeca: -8, orelha: 4, palpebra: 0, lingua: 0, rabo: 6, sombraY: 0, sombraK: 1
    });
    sentado.fixar(1);
  }

  if (reduz) {
    desenharParado();
    setTimeout(function () { falar("Oi, eu sou o Apolo. Estou de olho nas suas escolhas."); }, 800);
  } else {
    requestAnimationFrame(quadroAnim);
  }

  return {
    falar: falar,
    // Cursor sobre um cartão (computador): o Apolo já opina com a cara
    humor: function (h) { humorPasse = h || null; },
    abrirPresente: function (caixa, item) {
      acao(); acordar(false); esconderBalao();
      modo = "presente"; quadro = caixa; itemAtual = item; humorQuadro = item.humor || "neutro";
      reagiu = false; chamado = null; falaPendente = null;
      if (reduz) { falar(item.fala); return; }
      if (item.humor === "pano") soltarPano(caixa, item.fala);
    },
    fecharPresente: function () {
      modo = "livre"; quadro = null; itemAtual = null; humorQuadro = "neutro"; falaPendente = null;
      acao(); proxPasseio = agora() + 2;
    },
    comemorar: function (texto) {
      acao(); acordar(false);
      alegria = 1; linguaAte = agora() + 2.4;
      pular(520);
      setTimeout(function () { pular(400); }, 820);
      falar(texto);
    },
    // Copia o desenho, sentado e de língua de fora, para usar como retrato
    retrato: function (alvo, ajuste) {
      if (!alvo) return;
      var svg = raiz.querySelector("svg").cloneNode(true);
      // Retrato parado ganha textura de aquarela (no Apolo animado ficaria pesado)
      var g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("filter", "url(#aquarela)");
      while (svg.firstChild) g.appendChild(svg.firstChild);
      svg.appendChild(g);
      posar(partes(svg), {
        sentado: 1, deitado: 0, bob: 0, pitch: 0, inclina: 0, respX: 1, respY: 1, passos: [0, 0, 0, 0],
        noAr: 0, cabeca: -6, orelha: 4, palpebra: 0, lingua: 1, rabo: 10, sombraY: 0, sombraK: 1,
        sobrancelha: 0
      }, ajuste);
      alvo.appendChild(svg);
    }
  };
})();
