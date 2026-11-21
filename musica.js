/* Música da lista de presentes: alegre e fofinha, composta para a página e tocada
   pelo próprio navegador (ukulele, glockenspiel, kalimba, baixinho e chocalho).
   Não usa nenhum arquivo de áudio, então não há questão de direitos autorais.
   Fá maior, 104 batidas por minuto, com um leve balanço. */
window.Musica = (function () {
  "use strict";
  var AC = window.AudioContext || window.webkitAudioContext;
  var BPM = 104, COLCHEIA = 60 / BPM / 2, BALANCO = .16;   // a colcheia de trás atrasa um pouquinho
  var ctx = null, mestre = null, eco = null, ruidoBuf = null, cordas = {};
  var ligada = false, timer = null, passo = 0, proxTempo = 0, inicio = 0, desligando = null;

  function freq(nota) {
    var m = /^([A-G])(b|#)?(\d)$/.exec(nota);
    var semis = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === "b" ? -1 : m[2] === "#" ? 1 : 0);
    var midi = semis + (+m[3] + 1) * 12;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  /* ---------- A composição (8 compassos, colcheias; "-" é pausa) ---------- */
  // Progressão I–vi–IV–V: Fá, Ré menor, Si bemol, Dó
  var ACORDES = [
    { uke: ["A4", "C4", "F4", "A4"], baixo: ["F3", "C4"] },
    { uke: ["A4", "D4", "F4", "A4"], baixo: ["D3", "A3"] },
    { uke: ["Bb4", "D4", "F4", "Bb4"], baixo: ["Bb2", "F3"] },
    { uke: ["G4", "C4", "E4", "C5"], baixo: ["C3", "G3"] }
  ];
  var MELODIA = (
    "A5 - C6 - A5 G5 F5 - " +
    "F5 - A5 - D6 - C6 - " +
    "D6 - C6 Bb5 A5 - G5 - " +
    "G5 A5 G5 - E5 - C5 - " +
    "A5 - C6 - F6 - E6 - " +
    "D6 - C6 - A5 - F5 - " +
    "G5 - Bb5 - D6 C6 Bb5 A5 " +
    "G5 - E5 - G5 - C6 -"
  ).split(" ");
  // Batida do ukulele: baixo, baixo-cima, cima-baixo-cima
  var BATIDA = { 0: [1, 1], 2: [1, .8], 3: [-1, .55], 5: [-1, .55], 6: [1, .8], 7: [-1, .5] };

  /* ---------- Instrumentos ---------- */
  function montar() {
    ctx = new AC();
    mestre = ctx.createGain(); mestre.gain.value = 0;
    var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
    var tom = ctx.createBiquadFilter(); tom.type = "lowpass"; tom.frequency.value = 7000;
    mestre.connect(tom); tom.connect(comp); comp.connect(ctx.destination);

    // Sala pequena e aconchegante
    var dur = 1.4, n = Math.round(ctx.sampleRate * dur), ir = ctx.createBuffer(2, n, ctx.sampleRate);
    for (var ch = 0; ch < 2; ch++) { var d = ir.getChannelData(ch); for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3); }
    var conv = ctx.createConvolver(); conv.buffer = ir;
    eco = ctx.createGain(); eco.gain.value = .22;
    eco.connect(conv); conv.connect(mestre);

    ruidoBuf = ctx.createBuffer(1, ctx.sampleRate * .5, ctx.sampleRate);
    var r = ruidoBuf.getChannelData(0); for (var k = 0; k < r.length; k++) r[k] = Math.random() * 2 - 1;

    // Cordas do ukulele: Karplus-Strong (ruído curto que vira nota de corda dedilhada)
    ACORDES.forEach(function (a) { a.uke.forEach(function (nt) { if (!cordas[nt]) cordas[nt] = corda(freq(nt)); }); });
  }
  function corda(f) {
    var sr = ctx.sampleRate, dur = 1.3, n = Math.round(sr * dur), buf = ctx.createBuffer(1, n, sr), d = buf.getChannelData(0);
    var N = Math.round(sr / f), linha = new Float32Array(N);
    for (var i = 0; i < N; i++) linha[i] = Math.random() * 2 - 1;
    var p = 0;
    for (var j = 0; j < n; j++) {
      var prox = (p + 1) % N, v = (linha[p] + linha[prox]) * .5 * .996;
      d[j] = linha[p]; linha[p] = v; p = prox;
    }
    return buf;
  }
  function saida(destino, ganho, t, solto) {
    var g = ctx.createGain(); g.gain.setValueAtTime(ganho, t);
    g.connect(destino); if (solto) g.connect(eco);
    return g;
  }
  function tocarCorda(nota, t, vel) {
    var s = ctx.createBufferSource(); s.buffer = cordas[nota];
    var f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 2600;
    var g = saida(mestre, .2 * vel, t, true);
    g.gain.setTargetAtTime(0, t + .5, .18);
    s.connect(f); f.connect(g); s.start(t); s.stop(t + 1.3);
  }
  function glock(f, t, vel) {
    [[1, 1], [2.76, .22], [5.4, .06]].forEach(function (par) {
      var o = ctx.createOscillator(), g = saida(mestre, 0, t, true);
      o.type = "sine"; o.frequency.value = f * par[0];
      g.gain.setValueAtTime(.0001, t);
      g.gain.exponentialRampToValueAtTime(.15 * vel * par[1], t + .004);
      g.gain.exponentialRampToValueAtTime(.0001, t + (par[0] === 1 ? 1.3 : .35));
      o.connect(g); o.start(t); o.stop(t + 1.4);
    });
  }
  function kalimba(f, t, vel) {
    var o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = saida(mestre, 0, t, true);
    o.type = "sine"; o.frequency.value = f; o2.type = "triangle"; o2.frequency.value = f * 2.01;
    var g2 = ctx.createGain(); g2.gain.value = .12;
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(.2 * vel, t + .006);
    g.gain.exponentialRampToValueAtTime(.0001, t + .7);
    o.connect(g); o2.connect(g2); g2.connect(g);
    o.start(t); o2.start(t); o.stop(t + .75); o2.stop(t + .75);
  }
  function baixo(f, t, vel) {
    var o = ctx.createOscillator(), fl = ctx.createBiquadFilter(), g = saida(mestre, 0, t, false);
    o.type = "triangle"; o.frequency.value = f;
    fl.type = "lowpass"; fl.frequency.value = 700;
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(.3 * vel, t + .012);
    g.gain.exponentialRampToValueAtTime(.0001, t + .32);
    o.connect(fl); fl.connect(g); o.start(t); o.stop(t + .36);
  }
  function chocalho(t, vel) {
    var s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = saida(mestre, 0, t, false);
    s.buffer = ruidoBuf; fl.type = "highpass"; fl.frequency.value = 6500;
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(.045 * vel, t + .008);
    g.gain.exponentialRampToValueAtTime(.0001, t + .07);
    s.connect(fl); fl.connect(g); s.start(t, Math.random() * .4); s.stop(t + .08);
  }
  function estalo(t) {   // estalo de dedo bem baixinho no 2 e no 4
    var s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = saida(mestre, 0, t, true);
    s.buffer = ruidoBuf; fl.type = "bandpass"; fl.frequency.value = 2400; fl.Q.value = 1.4;
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(.06, t + .003);
    g.gain.exponentialRampToValueAtTime(.0001, t + .05);
    s.connect(fl); fl.connect(g); s.start(t, Math.random() * .4); s.stop(t + .06);
  }

  /* ---------- Arranjo: 16 compassos (8 com glockenspiel, 8 com kalimba) ---------- */
  function tocarPasso(p, t) {
    var compasso = Math.floor(p / 8) % 8, nesteCompasso = p % 8, volta = Math.floor(p / 64) % 2;
    var acorde = ACORDES[compasso % 4];
    var tt = t + (nesteCompasso % 2 ? COLCHEIA * BALANCO : 0);

    // Ukulele: as cordas soam uma depois da outra, como numa batida de verdade
    var b = BATIDA[nesteCompasso];
    if (b) {
      var ordem = b[0] > 0 ? acorde.uke : acorde.uke.slice().reverse();
      ordem.forEach(function (nt, i) { tocarCorda(nt, tt + i * .014, b[1] * (1 - i * .06)); });
    }
    // Baixinho
    if (nesteCompasso === 0) baixo(freq(acorde.baixo[0]), tt, 1);
    if (nesteCompasso === 3) baixo(freq(acorde.baixo[0]), tt, .5);
    if (nesteCompasso === 4) baixo(freq(acorde.baixo[1]), tt, .8);
    // Chocalho e estalo
    chocalho(tt, nesteCompasso % 2 ? 1 : .55);
    if (nesteCompasso === 2 || nesteCompasso === 6) estalo(tt);
    // Melodia: na primeira volta, glockenspiel; na segunda, kalimba uma oitava abaixo
    var nt = MELODIA[compasso * 8 + nesteCompasso];
    if (nt && nt !== "-") {
      if (volta === 0) glock(freq(nt), tt, nesteCompasso % 2 ? .75 : 1);
      else if (nesteCompasso % 2 === 0) kalimba(freq(nt) / 2, tt, 1);
    }
  }

  function agendar() {
    while (proxTempo < ctx.currentTime + .14) {
      tocarPasso(passo, proxTempo);
      proxTempo += COLCHEIA; passo = (passo + 1) % 128;
    }
  }

  /* ---------- Liga, desliga ---------- */
  function ligar() {
    if (!AC) return false;
    if (!ctx) montar();
    if (ctx.state === "suspended") ctx.resume();
    clearTimeout(desligando);
    if (!timer) {
      passo = 0; proxTempo = ctx.currentTime + .08; inicio = proxTempo;
      timer = setInterval(agendar, 25); agendar();
    }
    mestre.gain.cancelScheduledValues(ctx.currentTime);
    mestre.gain.setTargetAtTime(.58, ctx.currentTime, .5);
    ligada = true;
    return true;
  }
  function desligar() {
    if (!ctx) return;
    ligada = false;
    mestre.gain.cancelScheduledValues(ctx.currentTime);
    mestre.gain.setTargetAtTime(0, ctx.currentTime, .18);
    desligando = setTimeout(function () { clearInterval(timer); timer = null; }, 700);
  }
  document.addEventListener("visibilitychange", function () {
    if (!ctx) return;
    if (document.hidden) ctx.suspend();
    else if (ligada) ctx.resume();
  });

  var api = {
    bpm: BPM,
    ligar: ligar, desligar: desligar,
    ligada: function () { return ligada; },
    // Fase da batida (0 a 1), para o Apolo balançar a cabeça no ritmo
    batida: function () {
      if (!ligada || !ctx) return 0;
      var b = (ctx.currentTime - inicio) / (60 / BPM);
      return b - Math.floor(b);
    }
  };

  /* ---------- Botão ---------- */
  var botao = document.getElementById("musica");
  if (botao) {
    if (!AC) { botao.hidden = true; return api; }
    var falou = false;
    function atualizar() {
      botao.setAttribute("aria-pressed", ligada ? "true" : "false");
      botao.setAttribute("aria-label", ligada ? "Desligar a música" : "Ligar a música");
      botao.classList.toggle("tocando", ligada);
    }
    function lembrar() { try { sessionStorage.setItem("convite-som", ligada ? "1" : "0"); } catch (e) {} }
    function comecar() {
      ligar(); atualizar(); lembrar();
      if (!falou && window.Apolo) { falou = true; setTimeout(function () { Apolo.falar("Essa música fui eu que escolhi."); }, 900); }
    }
    botao.addEventListener("click", function () {
      if (ligada) { desligar(); atualizar(); lembrar(); } else comecar();
      soltarEspera();
    });
    // Quem entrou no convite com som ouve a música no primeiro toque na página
    var querSom = false;
    try { querSom = sessionStorage.getItem("convite-som") === "1"; } catch (e) {}
    function primeiroToque(e) {
      if (e.target && e.target.closest && e.target.closest("#musica")) return;
      soltarEspera();
      comecar();
    }
    function soltarEspera() {
      ["click", "touchend", "keydown"].forEach(function (t) { document.removeEventListener(t, primeiroToque, true); });
    }
    if (querSom) ["click", "touchend", "keydown"].forEach(function (t) { document.addEventListener(t, primeiroToque, true); });
    atualizar();
  }
  return api;
})();
