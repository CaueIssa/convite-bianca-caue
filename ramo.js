/* Ramo de eucalipto do convite, em aquarela, desenhado uma vez no cabeçalho
   da lista de presentes. Mesmas folhas, mesma haste e mesmo pincel do cenário
   do convite (cenario.js), parado e já crescido. */
(function () {
  var tela = document.getElementById("ramo");
  if (!tela || !tela.getContext) return;
  var c = tela.getContext("2d");

  // Coordenadas do convite em JPEG (1080 x 1350); o ramo ocupa x 0..250, y 270..1350
  var HASTE = [[108, 1350], [115, 1130], [130, 975], [142, 895], [152, 805], [160, 620], [158, 530], [150, 400]];
  var FOLHAS = [
    [108, 1335, 2, 1185, .36], [106, 1270, 0, 1112, .36], [125, 1055, 55, 915, .4], [105, 1205, 10, 1095, .34],
    [130, 975, 35, 865, .32], [130, 1350, 225, 1210, .34], [115, 1130, 222, 1005, .36], [108, 1335, 198, 1200, .36],
    [110, 1205, 210, 1070, .35], [125, 1055, 225, 965, .32], [142, 895, 228, 785, .34], [152, 805, 82, 695, .34],
    [158, 715, 238, 618, .32], [160, 620, 90, 520, .28], [158, 530, 240, 440, .3], [150, 400, 142, 282, .4]
  ].map(function (f, i) {
    var dx = f[2] - f[0], dy = f[3] - f[1];
    return { bx: f[0], by: f[1], c: Math.hypot(dx, dy), a: Math.atan2(dy, dx), l: f[4], fase: i * 2.399, inv: i % 2 ? -1 : 1, sprite: i };
  });

  function caminhoFolha(g, x0, y0, comp, larg) {
    g.moveTo(x0, y0);
    g.bezierCurveTo(x0 + comp * .2, y0 - larg * .95, x0 + comp * .68, y0 - larg * .82, x0 + comp, y0);
    g.bezierCurveTo(x0 + comp * .68, y0 + larg * .82, x0 + comp * .2, y0 + larg * .95, x0, y0);
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
      var g = cv.getContext("2d"), m = A / 2, t = TONS[k % 4];
      g.save();
      g.beginPath(); caminhoFolha(g, 2, m, L - 4, m - 4); g.clip();
      var g1 = g.createLinearGradient(0, 0, L, 0);
      g1.addColorStop(0, "rgb(" + t[0] + ")"); g1.addColorStop(1, "rgba(" + t[0] + ",.88)");
      g.fillStyle = g1; g.fillRect(0, 0, L, m);
      var g2 = g.createLinearGradient(0, 0, L, 0);
      g2.addColorStop(0, "rgb(" + t[1] + ")"); g2.addColorStop(1, "rgba(" + t[1] + ",.9)");
      g.fillStyle = g2; g.fillRect(0, m, L, m);
      for (var b = 0; b < 14; b++) {
        var bx = rnd() * L, by = rnd() * A, br = 18 + rnd() * 44;
        var gr = g.createRadialGradient(bx, by, 0, bx, by, br), cl = rnd() > .5 ? "255,255,245" : "52,84,64";
        gr.addColorStop(0, "rgba(" + cl + ",.13)"); gr.addColorStop(1, "rgba(" + cl + ",0)");
        g.fillStyle = gr; g.fillRect(bx - br, by - br, br * 2, br * 2);
      }
      for (var n = 0; n < 1800; n++) {
        g.fillStyle = rnd() > .5 ? "rgba(255,255,245,.1)" : "rgba(40,66,50,.1)";
        g.fillRect(rnd() * L, rnd() * A, 1.3, 1.3);
      }
      g.strokeStyle = "rgba(236,238,224,.72)"; g.lineWidth = 2.6; g.lineCap = "round";
      g.beginPath(); g.moveTo(2, m); g.quadraticCurveTo(L * .5, m - 2, L * .94, m); g.stroke();
      g.restore();
      g.strokeStyle = "rgba(58,88,68,.34)"; g.lineWidth = 2;
      g.beginPath(); caminhoFolha(g, 2, m, L - 4, m - 4); g.stroke();
      SPRITES.push(cv);
    }
  }

  function pontoHaste(s) {
    var n = HASTE.length - 1, alvoY = 1350 - s * 950;
    for (var i = 0; i < n; i++) {
      if (alvoY >= HASTE[i + 1][1]) {
        var t = (HASTE[i][1] - alvoY) / (HASTE[i][1] - HASTE[i + 1][1]);
        return [HASTE[i][0] + (HASTE[i + 1][0] - HASTE[i][0]) * t, alvoY];
      }
    }
    return [HASTE[n][0], HASTE[n][1]];
  }

  var larguraAnt = 0, alturaAnt = 0;
  function desenhar() {
    var w = tela.clientWidth, h = tela.clientHeight;
    if (!w || !h || (w === larguraAnt && h === alturaAnt)) return;
    larguraAnt = w; alturaAnt = h;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    tela.width = Math.round(w * dpr); tela.height = Math.round(h * dpr);
    var S = Math.min(w / 250, h / 1080) * dpr, Y0 = tela.height - 1350 * S;

    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, tela.width, tela.height);

    // Haste
    c.setTransform(S, 0, 0, S, 0, Y0);
    c.strokeStyle = "#64806b"; c.lineCap = "round";
    var ant = null;
    for (var i = 0; i <= 28; i++) {
      var s = i / 28, p = pontoHaste(s);
      if (ant) { c.lineWidth = 5.5 + (1.8 - 5.5) * s; c.beginPath(); c.moveTo(ant[0], ant[1]); c.lineTo(p[0], p[1]); c.stroke(); }
      ant = p;
    }

    // Folhas sobrepostas escurecem como aquarela
    c.globalCompositeOperation = "multiply";
    FOLHAS.forEach(function (f) {
      var a = f.a + Math.sin(f.fase) * .022 + Math.sin(f.fase * 3) * .008;
      var comp = f.c, larg = comp * f.l, sp = SPRITES[f.sprite];
      var ca = Math.cos(a), sa = Math.sin(a), sx = comp / sp.width, sy = larg / sp.height * f.inv;
      c.setTransform(S * ca * sx, S * sa * sx, -S * sa * sy, S * ca * sy, S * f.bx, Y0 + S * f.by);
      c.drawImage(sp, 0, -sp.height / 2);
    });
    c.globalCompositeOperation = "source-over";
    c.setTransform(1, 0, 0, 1, 0, 0);
    tela.classList.add("pronto");
  }

  criaSprites();
  desenhar();
  var espera;
  window.addEventListener("resize", function () { clearTimeout(espera); espera = setTimeout(desenhar, 150); });
})();
