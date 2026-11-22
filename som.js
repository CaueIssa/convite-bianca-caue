/* Som ambiente gerado no navegador: vento, folhas, pássaros e acordes suaves.
   Não usa nenhum arquivo de áudio, então não há questão de direitos autorais. */
window.Som = (function () {
  var ctx = null, mestre, analisador, ganhoVento, ganhoFolhas, ganhoPad, ligado = false, iniciado = false;
  var timers = [];

  function ruido(seg) {
    var n = ctx.sampleRate * seg, buf = ctx.createBuffer(2, n, ctx.sampleRate);
    for (var ch = 0; ch < 2; ch++) {
      var d = buf.getChannelData(ch), u = 0;
      for (var i = 0; i < n; i++) {
        u = (u + .02 * (Math.random() * 2 - 1)) / 1.02;
        d[i] = u * 3.5;
      }
      // Emenda sem clique no fim do laço
      for (var j = 0; j < 4000; j++) { var f = j / 4000; d[j] = d[j] * f + d[n - 4000 + j] * (1 - f); }
    }
    return buf;
  }

  function reverb() {
    var dur = 3.2, n = ctx.sampleRate * dur, ir = ctx.createBuffer(2, n, ctx.sampleRate);
    for (var ch = 0; ch < 2; ch++) {
      var d = ir.getChannelData(ch);
      for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.6);
    }
    var c = ctx.createConvolver(); c.buffer = ir; return c;
  }

  function laco(buf, filtro, freq, q, destino) {
    var s = ctx.createBufferSource(); s.buffer = buf; s.loop = true;
    var fl = ctx.createBiquadFilter(); fl.type = filtro; fl.frequency.value = freq; fl.Q.value = q;
    s.connect(fl); fl.connect(destino); s.start();
    return fl;
  }

  function lfo(freq, amp, alvo) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = freq; g.gain.value = amp; o.connect(g); g.connect(alvo); o.start();
  }

  function repetir(fn, min, max) {
    function prox() {
      timers.push(setTimeout(function () {
        if (ctx && ctx.state === "running") fn();
        prox();
      }, (min + Math.random() * (max - min)) * 1000));
    }
    prox();
  }

  // Passarinho ao longe: trinado (a nota treme depressa, como canto de verdade), baixinho
  // e abafado. Onda pura sem trinado soava como bipe de aparelho.
  function passaro(saida) {
    var t = ctx.currentTime + .05, base = 1900 + Math.random() * 900, notas = 2 + (Math.random() * 3 | 0);
    var pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    var abafa = ctx.createBiquadFilter(); abafa.type = "lowpass"; abafa.frequency.value = 3600; abafa.Q.value = .3;
    abafa.connect(saida);
    if (pan) { pan.pan.value = Math.random() * 1.2 - .6; pan.connect(abafa); }
    for (var i = 0; i < notas; i++) {
      var o = ctx.createOscillator(), g = ctx.createGain(), d = .09 + Math.random() * .12;
      var trinado = ctx.createOscillator(), fundo = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(base * (1 + Math.random() * .08), t);
      o.frequency.exponentialRampToValueAtTime(base * (.88 + Math.random() * .3), t + d);
      trinado.frequency.value = 26 + Math.random() * 14;
      fundo.gain.value = base * (.035 + Math.random() * .03);
      trinado.connect(fundo); fundo.connect(o.frequency);
      g.gain.setValueAtTime(.0001, t);
      g.gain.exponentialRampToValueAtTime(.011, t + d * .35);
      g.gain.exponentialRampToValueAtTime(.0001, t + d);
      o.connect(g); g.connect(pan || abafa);
      o.start(t); trinado.start(t); o.stop(t + d + .03); trinado.stop(t + d + .03);
      t += d + .05 + Math.random() * .12;
    }
  }

  var ACORDES = [
    [146.83, 220, 329.63, 369.99], [123.47, 246.94, 293.66, 440],
    [98, 196, 293.66, 369.99], [110, 220, 329.63, 554.37]
  ], indice = 0;

  function acorde(saida) {
    var t = ctx.currentTime, dur = 15, notas = ACORDES[indice++ % ACORDES.length];
    notas.forEach(function (f, i) {
      [-1.6, 1.6].forEach(function (cents) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = i === 0 ? "sine" : "triangle";
        o.frequency.value = f; o.detune.value = cents;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(i === 0 ? .03 : .014, t + 5);
        g.gain.setValueAtTime(i === 0 ? .03 : .014, t + dur - 6);
        g.gain.linearRampToValueAtTime(0, t + dur);
        o.connect(g); g.connect(saida);
        o.start(t); o.stop(t + dur + .1);
      });
    });
  }

  function montar() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    mestre = ctx.createGain(); mestre.gain.value = 0;
    var comp = ctx.createDynamicsCompressor();
    analisador = ctx.createAnalyser(); analisador.fftSize = 2048;
    mestre.connect(comp); comp.connect(analisador); analisador.connect(ctx.destination);

    var rev = reverb(), gRev = ctx.createGain(); gRev.gain.value = .55;
    rev.connect(gRev); gRev.connect(mestre);

    var buf = ruido(9);
    ganhoVento = ctx.createGain(); ganhoVento.gain.value = .3; ganhoVento.connect(mestre);
    var v1 = laco(buf, "lowpass", 420, .3, ganhoVento);
    lfo(.07, 170, v1.frequency);
    var gv2 = ctx.createGain(); gv2.gain.value = .32; gv2.connect(ganhoVento);
    var v2 = laco(buf, "bandpass", 760, .5, gv2);
    lfo(.11, 240, v2.frequency);
    lfo(.05, .12, gv2.gain);

    ganhoFolhas = ctx.createGain(); ganhoFolhas.gain.value = 0; ganhoFolhas.connect(mestre);
    laco(buf, "highpass", 3400, .4, ganhoFolhas);
    repetir(function () {
      var t = ctx.currentTime, pico = .03 + Math.random() * .09, d = .5 + Math.random() * 1.6;
      ganhoFolhas.gain.cancelScheduledValues(t);
      ganhoFolhas.gain.setTargetAtTime(pico, t, d * .3);
      ganhoFolhas.gain.setTargetAtTime(.012, t + d, d * .5);
    }, 1.2, 4.5);

    var gPass = ctx.createGain(); gPass.gain.value = .75;
    gPass.connect(mestre); gPass.connect(rev);
    repetir(function () { passaro(gPass); }, 8, 18);

    ganhoPad = ctx.createGain(); ganhoPad.gain.value = .3;
    var fPad = ctx.createBiquadFilter(); fPad.type = "lowpass"; fPad.frequency.value = 1050;
    ganhoPad.connect(fPad); fPad.connect(mestre); fPad.connect(rev);
    acorde(ganhoPad);
    repetir(function () { acorde(ganhoPad); }, 11, 11);
    return true;
  }

  function aplicar() {
    if (!ctx) return;
    var t = ctx.currentTime;
    mestre.gain.cancelScheduledValues(t);
    if (ligado) {
      if (ctx.state === "suspended") ctx.resume();
      mestre.gain.setTargetAtTime(.8, t, .9);
    } else {
      mestre.gain.setTargetAtTime(0, t, .25);
    }
  }

  // Ao trocar de aba ou sair: esvazia o volume antes de pausar (corte seco estala)
  var pausa = null;
  function esconder() {
    if (!ctx || ctx.state !== "running") return;
    var t = ctx.currentTime;
    mestre.gain.cancelScheduledValues(t);
    mestre.gain.setValueAtTime(mestre.gain.value, t);
    mestre.gain.setTargetAtTime(0, t, .03);
    clearTimeout(pausa);
    pausa = setTimeout(function () { if (document.hidden) ctx.suspend(); }, 150);
  }
  document.addEventListener("visibilitychange", function () {
    if (!ctx) return;
    if (document.hidden) { esconder(); return; }
    clearTimeout(pausa);
    if (ligado) ctx.resume().then(aplicar, function () {});
  });
  window.addEventListener("pagehide", esconder);

  return {
    ligar: function () {
      if (!iniciado) { iniciado = true; if (!montar()) return false; }
      ligado = true; aplicar(); return true;
    },
    desligar: function () { ligado = false; aplicar(); },
    ligado: function () { return ligado; },
    // Conforme a história avança, o vento acalma e os acordes aparecem
    misturar: function (p) {
      if (!ctx || !ligado) return;
      var t = ctx.currentTime;
      ganhoVento.gain.setTargetAtTime(.32 - .14 * p, t, .6);
      ganhoPad.gain.setTargetAtTime(.3 + .7 * p, t, .6);
    },
    nivel: function () {
      if (!analisador) return 0;
      var d = new Float32Array(analisador.fftSize), s = 0;
      analisador.getFloatTimeDomainData(d);
      for (var i = 0; i < d.length; i++) s += d[i] * d[i];
      return Math.sqrt(s / d.length);
    }
  };
})();
