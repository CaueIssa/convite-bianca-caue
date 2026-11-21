/* História na rolagem, entrada, som e compartilhamento */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var movimentoReduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var IMAGEM = "convite-final.jpg", NOME_ARQUIVO = "convite-bianca-caue.jpg";

  var mono = $("mono"), letraB = mono.querySelector(".b"), letraC = mono.querySelector(".c");
  var nome = $("nome"), frase = $("frase"), dica = $("dica"), pular = $("pular"), botaoSom = $("som");
  var acoes = $("acoes");

  function s(a, b, x) { var t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

  // [elemento, entra de, entra até, pousa de, pousa até, escala no centro]
  var BLOCOS = [
    { el: nome, a0: .34, a1: .40, b0: .44, b1: .50, kMax: 1.18 },
    { el: $("texto"), a0: .50, a1: .55, b0: .59, b1: .64, kMax: 1.25 },
    { el: $("data"), a0: .64, a1: .69, b0: .73, b1: .77, kMax: 1.35 },
    { el: $("local"), a0: .77, a1: .82, b0: 0, b1: 0, kMax: 1 },
    { el: $("almoco"), a0: .81, a1: .86, b0: 0, b1: 0, kMax: 1 },
    { el: acoes, a0: .88, a1: .94, b0: 0, b1: 0, kMax: 1 }
  ];
  var monoOrigem = { dx: 0, dy: 0 };

  function medirBlocos() {
    var vw = window.innerWidth, vh = window.innerHeight;
    BLOCOS.forEach(function (b) {
      b.el.style.transform = "none";
      var r = b.el.getBoundingClientRect();
      b.dx = b.b1 ? vw / 2 - (r.left + r.width / 2) : 0;
      b.dy = b.b1 ? vh * (b.el === nome ? .5 : .58) - (r.top + r.height / 2) : 0;
      // No centro da tela o bloco cresce, mas nunca passa das margens
      b.k = Math.max(1, Math.min(b.kMax, (vw - 32) / Math.max(1, r.width)));
    });
    // Monograma nasce atrás do nome e acompanha seu trajeto
    var alvo = $("alvo-mono").getBoundingClientRect(), n = nome.getBoundingClientRect();
    var u = alvo.width / 690;
    mono.style.left = (n.left + n.width / 2) + "px";
    mono.style.top = (n.top + n.height / 2) + "px";
    var cy = n.top + n.height / 2 - alvo.top;
    letraB.style.left = (-345 + 86) * u + "px"; letraB.style.top = (-36 * u - cy) + "px";
    letraC.style.left = (-345 + 308) * u + "px"; letraC.style.top = (34 * u - cy) + "px";
    aplicar(atual, true);
  }

  var estado = { luz: 0, crescimento: 0 };
  var atual = 0, alvoP = 0, ultimoAplicado = -1;

  function aplicar(p, forcar) {
    estado.luz = s(.004, .08, p);
    estado.crescimento = s(.03, .74, p);
    if (!forcar && Math.abs(p - ultimoAplicado) < .0004) return;
    ultimoAplicado = p;

    frase.style.opacity = s(.07, .11, p) * (1 - s(.2, .24, p));
    frase.style.transform = "translate(-50%, calc(-50% + " + (1 - s(.07, .14, p)) * 16 + "px))";

    BLOCOS.forEach(function (b) {
      var a = s(b.a0, b.a1, p), t = b.b1 ? s(b.b0, b.b1, p) : 1, r = 1 - t;
      b.el.style.opacity = a;
      b.el.style.transform = "translate(" + (b.dx * r).toFixed(1) + "px," + (b.dy * r + (1 - a) * 18).toFixed(1) + "px) scale(" + (1 + (b.k - 1) * r).toFixed(4) + ")";
    });

    var n = BLOCOS[0], am = s(.30, .40, p), rm = 1 - s(n.b0, n.b1, p);
    mono.style.opacity = am;
    mono.style.transform = "translate(" + (n.dx * rm).toFixed(1) + "px," + (n.dy * rm).toFixed(1) + "px) scale(" + (1 + (n.k - 1) * rm).toFixed(4) + ")";
    letraB.style.transform = "translateX(" + (-46 * (1 - am)).toFixed(1) + "px)";
    letraC.style.transform = "translateX(" + (46 * (1 - am)).toFixed(1) + "px)";

    acoes.style.visibility = p > .875 ? "visible" : "hidden";
    dica.style.opacity = p < .015 ? 1 : 0;
    pular.classList.toggle("oculto", p > .84);
    // Controles claros no escuro, escuros na parede clara
    document.documentElement.style.setProperty("--cor-controle", estado.luz > .5 ? "#262824" : "#efe9da");
    Som.misturar(s(.2, .9, p));
  }

  function lerRolagem() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 1;
  }

  // Laço principal
  var ultimo = performance.now(), inicio = ultimo, lentos = 0, contagem = 0;
  function laco(agora) {
    var real = (agora - ultimo) / 1000, dt = Math.min(.05, real); ultimo = agora;
    var t = (agora - inicio) / 1000;
    alvoP = lerRolagem();
    var delta = alvoP - atual;
    // Usa o tempo real: em aparelho lento a história acompanha a rolagem do mesmo jeito
    atual += delta * (1 - Math.exp(-Math.min(.5, real) * 5.5));
    if (Math.abs(delta) < .00005) atual = alvoP;
    Cenario.empurrar(Math.min(.12, Math.abs(delta) * .9));
    aplicar(atual);
    Cenario.quadro(t, dt, estado);
    // Aparelhos mais lentos perdem só a poeira e metade das atualizações da copa
    contagem++;
    if (dt > .03) lentos++;
    if (contagem === 120) { if (lentos > 70) Cenario.reduzir(); contagem = 0; lentos = 0; }
    requestAnimationFrame(laco);
  }

  // Ponteiro passando sobre o ramo também faz vento
  var px = 0, py = 0;
  window.addEventListener("pointermove", function (e) {
    var d = Math.hypot(e.clientX - px, e.clientY - py); px = e.clientX; py = e.clientY;
    if (!movimentoReduzido) Cenario.empurrar(Math.min(.04, d * .0004));
  }, { passive: true });

  // Entrada
  function atualizarBotaoSom() {
    var ligado = Som.ligado();
    botaoSom.setAttribute("aria-pressed", ligado ? "true" : "false");
    botaoSom.setAttribute("aria-label", ligado ? "Desligar som ambiente" : "Ligar som ambiente");
    // A lista de presentes lembra a escolha: quem está com som ouve a música de lá
    try { sessionStorage.setItem("convite-som", ligado ? "1" : "0"); } catch (e) {}
  }
  function entrar(comSom) {
    if (comSom) Som.ligar();
    atualizarBotaoSom();
    document.body.classList.remove("travado");
    document.body.classList.add("dentro");
    $("entrada").classList.add("saindo");
    setTimeout(function () { $("entrada").style.display = "none"; }, movimentoReduzido ? 0 : 950);
    if (movimentoReduzido) { $("compartilhar").focus({ preventScroll: true }); return; }
    botaoSom.focus({ preventScroll: true });
  }
  $("entrar-som").addEventListener("click", function () { entrar(true); });
  $("entrar-mudo").addEventListener("click", function () { entrar(false); });
  botaoSom.addEventListener("click", function () {
    if (Som.ligado()) Som.desligar(); else Som.ligar();
    atualizarBotaoSom();
  });
  pular.addEventListener("click", function () {
    window.scrollTo(0, document.documentElement.scrollHeight);
    acoes.style.visibility = "visible";
    $("compartilhar").focus({ preventScroll: true });
  });

  // Compartilhar: imagem e link quando o aparelho permite; senão, link e prévia
  var arquivo = null;
  function preparar() {
    if (arquivo || !window.fetch || !window.File) return;
    fetch(IMAGEM).then(function (r) { if (!r.ok) throw 0; return r.blob(); }).then(function (b) {
      arquivo = new File([b], NOME_ARQUIVO, { type: "image/jpeg" });
    }).catch(function () {});
  }
  function enderecoDaPagina() { return location.origin + location.pathname; }
  function abrirWhatsApp(msg) {
    window.open("https://wa.me/?text=" + encodeURIComponent(msg), "_blank", "noopener");
  }
  $("compartilhar").addEventListener("click", function () {
    var link = enderecoDaPagina();
    var msg = "Oi! Chegou um dia que a gente queria muito dividir com você: vamos nos casar, e seria uma alegria ter você com a gente em 02/12.\n\n" +
      "Preparamos este convite com muito carinho. Abre com o som ligado:\n" + link + "\n\nUm beijo,\nBianca e Cauê";
    if (arquivo && navigator.canShare && navigator.canShare({ files: [arquivo] })) {
      navigator.share({ files: [arquivo], text: msg }).catch(function (e) {
        if (e && e.name === "AbortError") return;
        abrirWhatsApp(msg);
      });
      return;
    }
    abrirWhatsApp(msg);
  });

  // Tamanho da tela: barra de endereço do celular não deve redesenhar tudo
  var larguraAnt = window.innerWidth, alturaAnt = window.innerHeight, espera;
  window.addEventListener("resize", function () {
    if (window.innerWidth === larguraAnt && Math.abs(window.innerHeight - alturaAnt) < 120) return;
    larguraAnt = window.innerWidth; alturaAnt = window.innerHeight;
    clearTimeout(espera);
    espera = setTimeout(function () { Cenario.medir(); medirBlocos(); if (movimentoReduzido) Cenario.quadro(10, 0, estado); }, 120);
  });

  // Início
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  document.body.classList.add("travado");
  window.scrollTo(0, 0);
  preparar();

  function comecar() {
    medirBlocos();
    if (movimentoReduzido) {
      // Sem animação: convite pronto, sem trilha de rolagem
      $("trilha").style.display = "none";
      frase.style.display = "none"; dica.style.display = "none"; pular.style.display = "none";
      atual = 1; aplicar(1, true);
      Cenario.quadro(10, 0, estado);
      return;
    }
    requestAnimationFrame(laco);
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(comecar); else comecar();
})();
