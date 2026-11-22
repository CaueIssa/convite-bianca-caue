/* Música da lista de presentes: alegre e fofinha, composta para a página e tocada
   pelo próprio navegador (ukulele de nylon, piano macio, marimba de madeira,
   baixinho e chocalho). Não usa arquivo de áudio, então não há questão de direitos
   autorais. Fá maior, 104 batidas por minuto, com um leve balanço.
   Timbres pensados para soar naturais: nada de ondas puras agudas (que soam como
   apito); cada nota começa e termina com envelope, sem estalos. */
window.Musica = (function () {
  "use strict";
  var AC = window.AudioContext || window.webkitAudioContext;
  var BPM = 104, COLCHEIA = 60 / BPM / 2, BALANCO = .16;   // a colcheia de trás atrasa um pouquinho
  var VOLUME = .62;
  var ctx = null, mestre = null, eco = null, ruidoBuf = null, ondaPiano = null, ondaBaixo = null, cordas = {};
  var ligada = false, timer = null, passo = 0, proxTempo = 0, inicio = 0, pausa = null;
  var aoMudar = function () {};   // avisa o botão quando o som de fato começa ou para

  function freq(nota) {
    var m = /^([A-G])(b|#)?(\d)$/.exec(nota);
    var semis = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === "b" ? -1 : m[2] === "#" ? 1 : 0);
    var midi = semis + (+m[3] + 1) * 12;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  /* ---------- A composição (8 compassos, colcheias; "-" é pausa) ---------- */
  // Progressão I–vi–IV–V: Fá, Ré menor, Si bemol, Dó
  var ACORDES = [
    { uke: ["A4", "C4", "F4", "A4"], baixo: ["F2", "C3"] },
    { uke: ["A4", "D4", "F4", "A4"], baixo: ["D2", "A2"] },
    { uke: ["Bb4", "D4", "F4", "Bb4"], baixo: ["Bb1", "F2"] },
    { uke: ["G4", "C4", "E4", "C5"], baixo: ["C2", "G2"] }
  ];
  // Melodia na região do meio (uma oitava abaixo da versão anterior): soa cantada, não apita
  var MELODIA = (
    "A4 - C5 - A4 G4 F4 - " +
    "F4 - A4 - D5 - C5 - " +
    "D5 - C5 Bb4 A4 - G4 - " +
    "G4 A4 G4 - E4 - C4 - " +
    "A4 - C5 - F5 - E5 - " +
    "D5 - C5 - A4 - F4 - " +
    "G4 - Bb4 - D5 C5 Bb4 A4 " +
    "G4 - E4 - G4 - C5 -"
  ).split(" ");
  // Batida do ukulele: baixo, baixo-cima, cima-baixo-cima
  var BATIDA = { 0: [1, 1], 2: [1, .8], 3: [-1, .5], 5: [-1, .5], 6: [1, .75], 7: [-1, .45] };

  /* ---------- Instrumentos ---------- */
  function montar() {
    ctx = new AC();
    ctx.onstatechange = function () { aoMudar(); };
    mestre = ctx.createGain(); mestre.gain.value = 0;
    var tom = ctx.createBiquadFilter(); tom.type = "lowpass"; tom.frequency.value = 5200; tom.Q.value = .5;
    var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 2.5; comp.attack.value = .01;
    mestre.connect(tom); tom.connect(comp); comp.connect(ctx.destination);

    // Sala de madeira: cauda de reverberação macia (ruído filtrado, sem brilho metálico)
    var dur = 1.6, n = Math.round(ctx.sampleRate * dur), ir = ctx.createBuffer(2, n, ctx.sampleRate);
    for (var ch = 0; ch < 2; ch++) {
      var d = ir.getChannelData(ch), lp = 0;
      for (var i = 0; i < n; i++) {
        lp += ((Math.random() * 2 - 1) - lp) * (.35 - .25 * i / n);   // fica mais abafada no fim
        d[i] = lp * Math.pow(1 - i / n, 2.4) * 1.8;
      }
    }
    var conv = ctx.createConvolver(); conv.buffer = ir;
    eco = ctx.createGain(); eco.gain.value = .2;
    eco.connect(conv); conv.connect(mestre);

    ruidoBuf = ctx.createBuffer(1, ctx.sampleRate * .5, ctx.sampleRate);
    var r = ruidoBuf.getChannelData(0); for (var k = 0; k < r.length; k++) r[k] = Math.random() * 2 - 1;

    // Piano macio: harmônicos que caem depressa (som redondo, de martelo de feltro)
    ondaPiano = ctx.createPeriodicWave(new Float32Array(8), new Float32Array([0, 1, .38, .16, .08, .035, .015, .006]));
    // Baixo redondo: fundamental com um tiquinho de segundo harmônico
    ondaBaixo = ctx.createPeriodicWave(new Float32Array(4), new Float32Array([0, 1, .22, .05]));

    // Cordas de nylon do ukulele
    ACORDES.forEach(function (a) { a.uke.forEach(function (nt) { if (!cordas[nt]) cordas[nt] = corda(freq(nt)); }); });
  }

  // Karplus-Strong com dedo, não palheta: ruído suavizado, posição do dedilhado e corda de nylon
  function corda(f) {
    var sr = ctx.sampleRate, dur = 1.4, n = Math.round(sr * dur), buf = ctx.createBuffer(1, n, sr), d = buf.getChannelData(0);
    var N = Math.round(sr / f), linha = new Float32Array(N), lp = 0, i;
    for (i = 0; i < N; i++) { lp += ((Math.random() * 2 - 1) - lp) * .45; linha[i] = lp; }      // dedo macio
    var desloc = Math.max(1, Math.round(N * .22)), copia = linha.slice();
    for (i = 0; i < N; i++) linha[i] = copia[i] - copia[(i + desloc) % N] * .8;                // ponto do dedilhado
    var p = 0, ant = 0;
    for (var j = 0; j < n; j++) {
      var prox = (p + 1) % N, v = (linha[p] * .6 + linha[prox] * .4) * .993;                  // nylon perde brilho rápido
      ant += (v - ant) * .9;
      d[j] = linha[p]; linha[p] = ant; p = prox;
    }
    // Ataque de 3 ms e final que some sem estalo
    var a = Math.round(sr * .003), z = Math.round(sr * .05);
    for (i = 0; i < a; i++) d[i] *= i / a;
    for (i = 0; i < z; i++) d[n - 1 - i] *= i / z;
    return buf;
  }

  function saida(t, solto) {
    var g = ctx.createGain(); g.gain.setValueAtTime(0, t);
    g.connect(mestre); if (solto) g.connect(eco);
    return g;
  }
  function envelope(g, t, pico, ataque, fim) {
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(pico, t + ataque);
    g.gain.exponentialRampToValueAtTime(.0001, t + fim);
  }

  function tocarCorda(nota, t, vel) {
    var s = ctx.createBufferSource(); s.buffer = cordas[nota];
    var f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 1900; f.Q.value = .4;
    var g = saida(t, true);
    g.gain.setValueAtTime(.17 * vel, t);
    g.gain.setTargetAtTime(.0001, t + .45, .16);
    s.connect(f); f.connect(g); s.start(t); s.stop(t + 1.4);
  }
  function piano(f, t, vel) {
    var fl = ctx.createBiquadFilter(), g = saida(t, true);
    fl.type = "lowpass"; fl.Q.value = .3;
    fl.frequency.setValueAtTime(Math.min(3400, f * 5), t);
    fl.frequency.exponentialRampToValueAtTime(Math.max(420, f * 1.3), t + .9);   // o brilho morre antes do som
    [-4, 4].forEach(function (cents) {   // duas cordas levemente desafinadas: calor de piano
      var o = ctx.createOscillator(); o.setPeriodicWave(ondaPiano);
      o.frequency.value = f; o.detune.value = cents;
      o.connect(fl); o.start(t); o.stop(t + 1.5);
    });
    fl.connect(g);
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(.1 * vel, t + .01);
    g.gain.exponentialRampToValueAtTime(.035 * vel, t + .3);
    g.gain.exponentialRampToValueAtTime(.0001, t + 1.4);
  }
  function marimba(f, t, vel) {
    var g = saida(t, true), o = ctx.createOscillator();
    o.type = "sine"; o.frequency.value = f;
    envelope(g, t, .17 * vel, .005, .6);
    o.connect(g); o.start(t); o.stop(t + .65);
    // Toque da baqueta na madeira: um harmônico curtinho e baixo
    var g2 = saida(t, false), o2 = ctx.createOscillator();
    o2.type = "sine"; o2.frequency.value = f * 3.93;
    envelope(g2, t, .025 * vel, .003, .07);
    o2.connect(g2); o2.start(t); o2.stop(t + .09);
  }
  function baixo(f, t, vel) {
    var o = ctx.createOscillator(), fl = ctx.createBiquadFilter(), g = saida(t, false);
    o.setPeriodicWave(ondaBaixo); o.frequency.value = f;
    fl.type = "lowpass"; fl.frequency.value = 480;
    envelope(g, t, .34 * vel, .015, .42);
    o.connect(fl); fl.connect(g); o.start(t); o.stop(t + .46);
  }
  function chocalho(t, vel) {
    var s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = saida(t, false);
    s.buffer = ruidoBuf; fl.type = "bandpass"; fl.frequency.value = 4800; fl.Q.value = .7;
    envelope(g, t, .028 * vel, .012, .09);
    s.connect(fl); fl.connect(g); s.start(t, Math.random() * .4); s.stop(t + .1);
  }

  /* ---------- Arranjo: 16 compassos (8 com piano, 8 com marimba) ---------- */
  function tocarPasso(p, t) {
    var compasso = Math.floor(p / 8) % 8, nesteCompasso = p % 8, volta = Math.floor(p / 64) % 2;
    var acorde = ACORDES[compasso % 4];
    var tt = t + (nesteCompasso % 2 ? COLCHEIA * BALANCO : 0);

    // Ukulele: as cordas soam uma depois da outra, como numa batida de verdade
    var b = BATIDA[nesteCompasso];
    if (b) {
      var ordem = b[0] > 0 ? acorde.uke : acorde.uke.slice().reverse();
      ordem.forEach(function (nt, i) { tocarCorda(nt, tt + i * .016, b[1] * (1 - i * .07)); });
    }
    // Baixinho
    if (nesteCompasso === 0) baixo(freq(acorde.baixo[0]), tt, 1);
    if (nesteCompasso === 3) baixo(freq(acorde.baixo[0]), tt, .45);
    if (nesteCompasso === 4) baixo(freq(acorde.baixo[1]), tt, .8);
    // Chocalho bem leve
    chocalho(tt, nesteCompasso % 2 ? 1 : .5);
    // Melodia: na primeira volta, piano; na segunda, marimba
    var nt = MELODIA[compasso * 8 + nesteCompasso];
    if (nt && nt !== "-") {
      if (volta === 0) piano(freq(nt), tt, nesteCompasso % 2 ? .75 : 1);
      else marimba(freq(nt), tt, nesteCompasso % 2 ? .7 : 1);
    }
  }

  function agendar() {
    if (!ctx || ctx.state !== "running") return;
    // Se a página travou ou ficou em segundo plano, pula o que passou em vez de tocar tudo de uma vez
    if (proxTempo < ctx.currentTime) {
      var perdidos = Math.ceil((ctx.currentTime - proxTempo) / COLCHEIA);
      proxTempo += perdidos * COLCHEIA; passo = (passo + perdidos) % 128;
    }
    while (proxTempo < ctx.currentTime + .14) {
      tocarPasso(passo, proxTempo);
      proxTempo += COLCHEIA; passo = (passo + 1) % 128;
    }
  }

  /* ---------- Liga, desliga, pausa ao sair ---------- */
  function subir(alvo, constante) {
    var t = ctx.currentTime;
    mestre.gain.cancelScheduledValues(t);
    mestre.gain.setValueAtTime(mestre.gain.value, t);
    mestre.gain.setTargetAtTime(alvo, t, constante);
  }
  function comecarRelogio() {
    if (timer) return;
    passo = 0; proxTempo = ctx.currentTime + .1; inicio = proxTempo;
    timer = setInterval(agendar, 25); agendar();
  }
  function ligar() {
    if (!AC) return false;
    if (!ctx) montar();
    clearTimeout(pausa);
    ligada = true;
    var seguir = function () { if (!ligada) return; comecarRelogio(); subir(VOLUME, .6); };
    if (ctx.state !== "running") ctx.resume().then(seguir, function () {}); else seguir();
    return true;
  }
  function desligar() {
    if (!ctx) return;
    ligada = false;
    subir(0, .15);
    clearTimeout(pausa);
    pausa = setTimeout(function () { clearInterval(timer); timer = null; }, 800);
  }
  // Ao trocar de aba ou sair: esvazia o volume antes de pausar (nada de corte seco)
  function esconder() {
    if (!ctx || ctx.state !== "running") return;
    subir(0, .03);
    clearTimeout(pausa);
    pausa = setTimeout(function () { if (document.hidden || !ligada) ctx.suspend(); }, 150);
  }
  function mostrar() {
    if (!ctx || !ligada) return;
    clearTimeout(pausa);
    ctx.resume().then(function () { if (ligada) subir(VOLUME, .5); }, function () {});
  }
  document.addEventListener("visibilitychange", function () { if (document.hidden) esconder(); else mostrar(); });
  // Os navegadores só liberam som depois de um gesto da pessoa. Vindo do convite (clique no
  // botão da lista) o Chrome já libera na hora; no iPhone, ou abrindo o link direto, a música
  // fica pronta e começa no primeiro toque, clique ou tecla em qualquer lugar da página.
  // Toque em link não conta (a pessoa está saindo), e o botão "Música" cuida de si mesmo.
  ["pointerdown", "pointerup", "touchend", "click", "keydown"].forEach(function (t) {
    document.addEventListener(t, function (e) {
      if (e.target && e.target.closest && e.target.closest("a[href], #musica")) return;
      if (ligada && ctx && ctx.state !== "running" && !document.hidden) {
        ctx.resume().then(function () { if (ligada) { comecarRelogio(); subir(VOLUME, .5); } }, function () {});
      }
    }, true);
  });
  window.addEventListener("pagehide", esconder);
  window.addEventListener("pageshow", function (e) { if (e.persisted) mostrar(); });

  var api = {
    bpm: BPM,
    ligar: ligar, desligar: desligar,
    ligada: function () { return ligada; },
    // Fase da batida (0 a 1), para o Apolo balançar a cabeça no ritmo
    batida: function () {
      if (!ligada || !ctx || !timer) return 0;
      var b = (ctx.currentTime - inicio) / (60 / BPM);
      return b - Math.floor(b);
    }
  };

  /* ---------- Botão e início automático ---------- */
  var botao = document.getElementById("musica");
  if (!AC) { if (botao) botao.hidden = true; return api; }
  var tocando = function () { return ligada && ctx && ctx.state === "running"; };
  var atualizar = function () {
    if (!botao) return;
    var t = tocando();
    botao.setAttribute("aria-pressed", t ? "true" : "false");
    botao.setAttribute("aria-label", t ? "Desligar a música" : "Ligar a música");
    botao.classList.toggle("tocando", t);
  };
  aoMudar = atualizar;
  var lembrar = function () { try { sessionStorage.setItem("convite-som", ligada ? "1" : "0"); } catch (e) {} };
  var falou = false;
  if (botao) {
    botao.addEventListener("click", function () {
      if (tocando()) desligar();
      else {
        ligar();
        if (!falou && window.Apolo) { falou = true; setTimeout(function () { Apolo.falar("Essa música fui eu que escolhi."); }, 900); }
      }
      atualizar(); lembrar();
    });
  }
  // Começa sozinha ao entrar na lista. Só fica quieta se a pessoa escolheu "Entrar sem som"
  // no convite ou desligou a música aqui mesmo (a escolha vale até fechar o navegador).
  var escolha = null;
  try { escolha = sessionStorage.getItem("convite-som"); } catch (e) {}
  var autoIniciar = function () {
    if (document.hidden) return;   // aberta em segundo plano: espera a aba aparecer
    document.removeEventListener("visibilitychange", autoIniciar);
    ligar(); atualizar();
  };
  if (escolha !== "0") { document.addEventListener("visibilitychange", autoIniciar); autoIniciar(); }
  atualizar();
  return api;
})();
