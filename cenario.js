/* Eucalipto, luz e sombras desenhados em tempo real.
   Coordenadas do ramo seguem o convite em JPEG (1080 x 1350). */
window.Cenario = (function () {
  var cRamo = document.getElementById("c-ramo"), xRamo = cRamo.getContext("2d");
  var cLuz = document.getElementById("c-luz"), xLuz = cLuz.getContext("2d");
  var cPo = document.getElementById("c-poeira"), xPo = cPo.getContext("2d");

  // Camada desfocada: desenha pequeno e amplia em etapas, sem blocos nem serrilhado
  function CamadaSuave(etapas) {
    this.telas = [];
    for (var i = 0; i < etapas; i++) this.telas.push(document.createElement("canvas"));
    this.ctxs = this.telas.map(function (t) { return t.getContext("2d"); });
    this.c = this.ctxs[0];
    this.tela = this.telas[0];
  }
  // "menor" é o maior lado, em pixels, da etapa mais desfocada; cada etapa seguinte dobra
  CamadaSuave.prototype.medir = function (w, h, menor) {
    var esc = Math.max(w, h) / menor;
    for (var i = 0; i < this.telas.length; i++, esc /= 2) {
      this.telas[i].width = Math.max(1, Math.ceil(w / esc));
      this.telas[i].height = Math.max(1, Math.ceil(h / esc));
      this.ctxs[i].imageSmoothingEnabled = true;
      this.ctxs[i].imageSmoothingQuality = "high";
    }
  };
  CamadaSuave.prototype.limpar = function () {
    this.c.setTransform(1, 0, 0, 1, 0, 0);
    this.c.clearRect(0, 0, this.tela.width, this.tela.height);
  };
  CamadaSuave.prototype.ampliar = function () {
    for (var i = 1; i < this.telas.length; i++) {
      var t = this.telas[i];
      this.ctxs[i].clearRect(0, 0, t.width, t.height);
      this.ctxs[i].drawImage(this.telas[i - 1], 0, 0, t.width, t.height);
    }
    return this.telas[this.telas.length - 1];
  };
  var camCopa = new CamadaSuave(5);
  var camFeixe = new CamadaSuave(4);
  var camSombra = new CamadaSuave(4);

  var W = 0, H = 0, dpr = 1, S = 1, ox = 0;
  var ESC_LUZ = 3, escSombra = 16;
  var vento = 0, rajada = 0, qualidade = 1;

  // Hastes: da raiz até a ponta
  var HASTE = [[108, 1350], [115, 1130], [130, 975], [142, 895], [152, 805], [160, 620], [158, 530], [150, 400]];
  // Folhas: base x, base y, ponta x, ponta y, largura relativa. Do fundo para a frente.
  var FOLHAS = [
    [108, 1335, 2, 1185, .36], [106, 1270, 0, 1112, .36], [125, 1055, 55, 915, .4], [105, 1205, 10, 1095, .34],
    [130, 975, 35, 865, .32], [130, 1350, 225, 1210, .34], [115, 1130, 222, 1005, .36], [108, 1335, 198, 1200, .36],
    [110, 1205, 210, 1070, .35], [125, 1055, 225, 965, .32], [142, 895, 228, 785, .34], [152, 805, 82, 695, .34],
    [158, 715, 238, 618, .32], [160, 620, 90, 520, .28], [158, 530, 240, 440, .3], [150, 400, 142, 282, .4]
  ].map(function (f, i) {
    var dx = f[2] - f[0], dy = f[3] - f[1];
    return {
      bx: f[0], by: f[1], c: Math.hypot(dx, dy), a: Math.atan2(dy, dx), l: f[4],
      s: Math.min(1, Math.max(0, (1350 - f[1]) / 950)),
      fase: i * 2.399, freq: 1.3 + (i * 7 % 5) * .23, inv: i % 2 ? -1 : 1, sprite: i
    };
  });
  // Copa fora de cena: projeta sombra de folhas grandes na parede
  var COPA = [];
  (function () {
    var r = 12345;
    function rnd() { r = (r * 16807) % 2147483647; return r / 2147483647; }
    for (var i = 0; i < 22; i++) {
      COPA.push({
        x: .35 + rnd() * .8, y: -.05 + rnd() * .62, a: rnd() * 6.28,
        c: .14 + rnd() * .16, f: rnd() * 6.28, v: .25 + rnd() * .5
      });
    }
  })();
  var POEIRA = [];
  for (var i = 0; i < 34; i++) POEIRA.push({ x: Math.random(), y: Math.random(), r: .7 + Math.random() * 1.8, v: .004 + Math.random() * .012, f: Math.random() * 6.28 });

  function mistura(a, b, t) { return a + (b - a) * t; }
  function suave(a, b, x) { var t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

  function caminhoFolha(c, x0, y0, comp, larg) {
    c.moveTo(x0, y0);
    c.bezierCurveTo(x0 + comp * .2, y0 - larg * .95, x0 + comp * .68, y0 - larg * .82, x0 + comp, y0);
    c.bezierCurveTo(x0 + comp * .68, y0 + larg * .82, x0 + comp * .2, y0 + larg * .95, x0, y0);
  }

  // Folha em aquarela: duas tonalidades, manchas, granulação e borda mais escura
  var SPRITES = [];
  function criaSprites() {
    var TONS = [
      [[176, 199, 176], [118, 152, 125]], [[160, 188, 163], [92, 129, 102]], [[188, 207, 186], [136, 168, 140]],
      [[150, 180, 154], [84, 120, 94]]
    ];
    var L = 340, A = 150, r = 777;
    function rnd() { r = (r * 16807) % 2147483647; return r / 2147483647; }
    for (var k = 0; k < 16; k++) {
      var cv = document.createElement("canvas"); cv.width = L; cv.height = A;
      var c = cv.getContext("2d"), m = A / 2, t = TONS[k % 4];
      c.save();
      c.beginPath(); caminhoFolha(c, 2, m, L - 4, m - 4); c.clip();
      var g1 = c.createLinearGradient(0, 0, L, 0);
      g1.addColorStop(0, "rgb(" + t[0] + ")"); g1.addColorStop(1, "rgba(" + t[0] + ",.88)");
      c.fillStyle = g1; c.fillRect(0, 0, L, m);
      var g2 = c.createLinearGradient(0, 0, L, 0);
      g2.addColorStop(0, "rgb(" + t[1] + ")"); g2.addColorStop(1, "rgba(" + t[1] + ",.9)");
      c.fillStyle = g2; c.fillRect(0, m, L, m);
      for (var b = 0; b < 14; b++) {
        var bx = rnd() * L, by = rnd() * A, br = 18 + rnd() * 44;
        var g = c.createRadialGradient(bx, by, 0, bx, by, br), cl = rnd() > .5 ? "255,255,245" : "52,84,64";
        g.addColorStop(0, "rgba(" + cl + ",.13)"); g.addColorStop(1, "rgba(" + cl + ",0)");
        c.fillStyle = g; c.fillRect(bx - br, by - br, br * 2, br * 2);
      }
      for (var n = 0; n < 2600; n++) {
        c.fillStyle = rnd() > .5 ? "rgba(255,255,245,.1)" : "rgba(40,66,50,.1)";
        c.fillRect(rnd() * L, rnd() * A, 1.3, 1.3);
      }
      c.strokeStyle = "rgba(236,238,224,.72)"; c.lineWidth = 2.6; c.lineCap = "round";
      c.beginPath(); c.moveTo(2, m); c.quadraticCurveTo(L * .5, m - 2, L * .94, m); c.stroke();
      c.restore();
      c.strokeStyle = "rgba(58,88,68,.34)"; c.lineWidth = 2;
      c.beginPath(); caminhoFolha(c, 2, m, L - 4, m - 4); c.stroke();
      SPRITES.push(cv);
    }
  }

  function medir() {
    W = Math.max(1, window.innerWidth); H = Math.max(1, window.innerHeight);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    S = W < 700 ? Math.min(H * .00048, W * .00105) : H / 1090;
    ox = W < 700 ? -S * 30 : Math.max(0, (W - 1200) * .06);
    var larg = Math.ceil(Math.min(W, ox + 300 * S)), alt = H;
    cRamo.width = larg * dpr; cRamo.height = alt * dpr;
    cRamo.style.width = larg + "px"; cRamo.style.height = alt + "px";
    cLuz.width = Math.ceil(W / ESC_LUZ); cLuz.height = Math.ceil(H / ESC_LUZ);
    xLuz.imageSmoothingEnabled = true; xLuz.imageSmoothingQuality = "high";
    camCopa.medir(W, H, 32); camFeixe.medir(W, H, 48);
    // Desfoque da sombra do ramo acompanha o tamanho do ramo na tela
    escSombra = Math.max(6, 22 * S);
    camSombra.medir(W, H, Math.max(W, H) / escSombra);
    cPo.width = W; cPo.height = H;
  }

  function pontoHaste(s) {
    var n = HASTE.length - 1, alvoY = 1350 - s * 950;
    for (var i = 0; i < n; i++) {
      if (alvoY >= HASTE[i + 1][1]) {
        var t = (HASTE[i][1] - alvoY) / (HASTE[i][1] - HASTE[i + 1][1]);
        return [mistura(HASTE[i][0], HASTE[i + 1][0], t), alvoY];
      }
    }
    return [HASTE[n][0], HASTE[n][1]];
  }

  function folhaGrow(f, g) {
    var t = Math.min(1, Math.max(0, (g * 1.14 - f.s) / .14));
    return t * (2 - t);
  }

  function desenhaRamo(t, g) {
    var c = xRamo;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, cRamo.width, cRamo.height);
    if (g <= 0) return;
    var ctx = dpr * S, Y0 = H * dpr - 1350 * ctx, X0 = ox * dpr;

    // Haste
    c.setTransform(ctx, 0, 0, ctx, X0, Y0);
    c.strokeStyle = "#64806b"; c.lineCap = "round";
    var passos = 28, gm = Math.min(1, g * 1.04);
    var ant = null;
    for (var i = 0; i <= passos; i++) {
      var s = gm * i / passos, p = pontoHaste(s), dx = vento * s * s;
      if (ant) {
        c.lineWidth = mistura(5.5, 1.8, s);
        c.beginPath(); c.moveTo(ant[0], ant[1]); c.lineTo(p[0] + dx, p[1]); c.stroke();
      }
      ant = [p[0] + dx, p[1]];
    }

    // Folhas sobrepostas escurecem como aquarela
    c.globalCompositeOperation = "multiply";
    for (var k = 0; k < FOLHAS.length; k++) {
      var f = FOLHAS[k], gf = folhaGrow(f, g);
      if (gf <= 0) continue;
      var bend = vento * f.s * f.s, giro = vento * .0042 * (.4 + f.s);
      var tremor = Math.sin(t * f.freq + f.fase) * (.022 + rajada * .05) + Math.sin(t * f.freq * 2.7 + f.fase * 3) * (.008 + rajada * .03);
      var a = f.a + giro + tremor + (1 - gf) * .5 * f.inv;
      var comp = f.c * gf, larg = comp * f.l;
      var ca = Math.cos(a), sa = Math.sin(a), sp = SPRITES[f.sprite];
      var sx = comp / sp.width, sy = larg / sp.height * f.inv;
      // Base da folha acompanha a curvatura da haste
      c.setTransform(ctx * ca * sx, ctx * sa * sx, -ctx * sa * sy, ctx * ca * sy, X0 + ctx * (f.bx + bend), Y0 + ctx * f.by);
      c.drawImage(sp, 0, -sp.height / 2);
    }
    c.globalCompositeOperation = "source-over";
    c.setTransform(1, 0, 0, 1, 0, 0);
  }

  function desenhaCopa(t) {
    camCopa.limpar();
    var c = camCopa.c, w = camCopa.tela.width, h = camCopa.tela.height;
    c.fillStyle = "rgb(112,104,84)";
    var base = Math.max(w, h);
    for (var i = 0; i < COPA.length; i++) {
      var o = COPA[i], bal = Math.sin(t * o.v + o.f) + Math.sin(t * o.v * .37 + o.f * 2) * .6;
      var x = (o.x * w) + bal * base * (.012 + rajada * .02), y = o.y * h + Math.cos(t * o.v * .8 + o.f) * base * .006;
      var cp = o.c * base, a = o.a + bal * .08;
      c.setTransform(Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), x, y);
      c.beginPath(); caminhoFolha(c, -cp / 2, 0, cp, cp * .22); c.fill();
    }
    c.setTransform(1, 0, 0, 1, 0, 0);
  }

  function desenhaFeixes(t, luz, nuvem) {
    camFeixe.limpar();
    var c = camFeixe.c, w = camFeixe.tela.width, h = camFeixe.tela.height;
    var deriva = Math.sin(t * .05) * w * .03 + (1 - luz) * w * .25;
    var forca = luz * (.6 - nuvem * .14);
    var quente = 1 - suave(.2, 1, luz);
    var cor = (mistura(12, 62, quente) | 0) + "," + (mistura(13, 40, quente) | 0) + "," + (mistura(16, 14, quente) | 0);
    var g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "rgba(" + cor + "," + forca + ")");
    g.addColorStop(.75, "rgba(" + cor + "," + forca * .7 + ")");
    g.addColorStop(1, "rgba(" + cor + ",0)");
    c.fillStyle = g;
    var fatias = [[.2, .36], [.4, .56], [.6, .76], [.8, .94]];
    for (var i = 0; i < fatias.length; i++) {
      var x0 = w * fatias[i][0] + deriva, x1 = w * fatias[i][1] + deriva, inc = h * .34;
      c.beginPath();
      c.moveTo(x0 + inc, 0); c.lineTo(x1 + inc, 0); c.lineTo(x1 - inc * .5, h); c.lineTo(x0 - inc * .5, h);
      c.closePath(); c.fill();
    }
  }

  // Sombra do proprio ramo, projetada para o lado oposto ao sol
  function desenhaSombraRamo(t, g) {
    camSombra.limpar();
    var c = camSombra.c, e = S / escSombra;
    var X0 = ox / escSombra + (24 + Math.sin(t * .05) * 6) * e, Y0 = (H - 1350 * S) / escSombra + 20 * e;
    c.fillStyle = "rgb(112,106,86)";
    for (var k = 0; k < FOLHAS.length; k++) {
      var f = FOLHAS[k], gf = folhaGrow(f, g);
      if (gf <= 0) continue;
      var a = f.a + vento * .005 * (.4 + f.s) + Math.sin(t * f.freq * .7 + f.fase) * .03;
      var comp = f.c * gf * e, larg = comp * f.l * .5;
      c.setTransform(Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), X0 + e * (f.bx + vento * f.s * f.s * 1.4), Y0 + e * f.by);
      c.beginPath(); caminhoFolha(c, 0, 0, comp, larg); c.fill();
    }
    c.setTransform(1, 0, 0, 1, 0, 0);
  }

  function desenhaLuz(t, luz, g) {
    var c = xLuz, w = cLuz.width, h = cLuz.height;
    // Ambiente: do escuro da entrada para a manha clara, com nuvens passando devagar
    var nuvem = .5 + .5 * Math.sin(t * .11) * Math.sin(t * .067 + 1.3);
    var fator = 1 - .02 * nuvem * luz;
    var ar = mistura(30, 248, luz) * fator, ag = mistura(38, 245, luz) * fator, ab = mistura(38, 237, luz) * fator;
    c.globalCompositeOperation = "source-over";
    c.globalAlpha = 1;
    c.fillStyle = "rgb(" + (ar | 0) + "," + (ag | 0) + "," + (ab | 0) + ")";
    c.fillRect(0, 0, w, h);

    // Sol entrando pela janela, deslizando na parede
    desenhaFeixes(t, luz, nuvem);
    c.globalCompositeOperation = "lighter";
    c.drawImage(camFeixe.ampliar(), 0, 0, w, h);

    // Sombras de folhas grandes, bem difusas
    c.globalCompositeOperation = "multiply";
    if (qualidade > 0 || ((t * 20) | 0) % 2 === 0) desenhaCopa(t);
    c.globalAlpha = .085 * luz;
    c.drawImage(camCopa.ampliar(), 0, 0, w, h);

    if (g > 0) {
      desenhaSombraRamo(t, g);
      c.globalAlpha = .2 * luz;
      c.drawImage(camSombra.ampliar(), 0, 0, w, h);
    }
    c.globalAlpha = 1;

    // Vinheta
    var raio = Math.hypot(w, h) * .62, gv = c.createRadialGradient(w * .55, h * .42, raio * .45, w * .55, h * .42, raio);
    var vv = mistura(.5, .035, luz);
    gv.addColorStop(0, "rgba(40,48,42,0)"); gv.addColorStop(1, "rgba(40,48,42," + vv + ")");
    c.fillStyle = gv; c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = "source-over";
  }

  function desenhaPoeira(t, dt, luz) {
    var c = xPo;
    c.clearRect(0, 0, W, H);
    if (qualidade === 0) return;
    for (var i = 0; i < POEIRA.length; i++) {
      var d = POEIRA[i];
      d.y -= d.v * dt; if (d.y < -.02) d.y = 1.02;
      var x = (d.x + Math.sin(t * .2 + d.f) * .025 + vento * .0002) * W, y = d.y * H;
      var brilho = .5 + .5 * Math.sin(t * .6 + d.f * 3);
      c.fillStyle = "rgba(255,246,222," + (mistura(.55, .75, luz) * brilho).toFixed(3) + ")";
      c.beginPath(); c.arc(x, y, d.r, 0, 6.3); c.fill();
    }
  }

  // Vento: balanço lento, mais rajadas vindas da rolagem ou do ponteiro
  function atualizaVento(t, dt) {
    rajada = Math.max(0, rajada - dt * .55);
    var natural = Math.sin(t * .62) * 7 + Math.sin(t * 1.27 + 1) * 4 + Math.sin(t * .21 + 2) * 5;
    var alvo = natural * (1 + rajada * 1.8) + rajada * 10;
    vento += (alvo - vento) * Math.min(1, dt * 3);
  }

  function quadro(t, dt, estado) {
    atualizaVento(t, dt);
    desenhaRamo(t, estado.crescimento);
    desenhaLuz(t, estado.luz, estado.crescimento);
    desenhaPoeira(t, dt, estado.luz);
  }

  criaSprites();
  medir();

  return {
    medir: medir,
    quadro: quadro,
    empurrar: function (v) { rajada = Math.min(1, rajada + v); },
    reduzir: function () { qualidade = 0; }
  };
})();
