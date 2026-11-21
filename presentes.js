/* Lista de presentes: monta os cartões, abre o quadro do presente e gera o Pix. */
(function () {
  "use strict";

  /* ================= PIX =================
     Quando a chave existir, preencha e publique. Enquanto "chave" estiver vazia,
     o quadro mostra "A chave Pix chega em breve" e não há código para copiar.
     chave:  celular com +55 e DDD (ex.: "+5521999999999"), e-mail, CPF só com
             números ou a chave aleatória.
     nome:   titular da conta, como aparece no banco (até 25 letras).
     cidade: cidade do titular (até 15 letras). */
  var PIX = {
    chave: "+5521971810233",   // celular (21) 97181-0233
    nome: "Bianca e Caue",
    cidade: "Rio de Janeiro"
  };

  /* ============== PRESENTES ==============
     valor:   0 = valor livre. A ordem do cardápio segue a ordem desta lista.
     carimbo: parecer do Apolo, em duas linhas [em cima, embaixo] do selo redondo.
     tinta:   cor do carimbo: "verde", "terra" ou "grafite".
     humor:   como o Apolo reage ao quadro aberto
              aprova | julga | nega | ressalva | fofoca | neutro | pano
     fala:    o que ele diz quando o quadro abre. */
  var PRESENTES = [
    { nome: "Pano de chão (reposição)", desc: "O Apolo come pano de chão. Não é força de expressão.", valor: 35,
      carimbo: ["Aprovado", "pelo Apolo"], tinta: "verde", humor: "pano", fala: "Que pano?" },
    { nome: "Rolo tira-pelos industrial", desc: "O Apolo vai ao almoço. Considere isto um pedido de desculpas antecipado.", valor: 45,
      carimbo: ["Apolo não", "vê problema"], tinta: "grafite", humor: "neutro", fala: "Que pelo?" },
    { nome: "Bolinha indestrutível", desc: "Testada em laboratório. Ainda não testada no Apolo.", valor: 60,
      carimbo: ["Aprovado", "pelo Apolo"], tinta: "verde", humor: "aprova", fala: "Aceito o desafio." },
    { nome: "Petiscos para negociação", desc: "Moeda oficial da casa. Câmbio atual: um petisco por pano de chão devolvido inteiro.", valor: 80,
      carimbo: ["Aprovado", "pelo Apolo"], tinta: "verde", humor: "aprova", fala: "Agora a gente está negociando." },
    { nome: "Silêncio do Apolo", desc: "Ele é fofoqueiro. Este valor garante que o que ele ouvir no almoço fica no almoço.", valor: 150,
      carimbo: ["Apolo não", "garante nada"], tinta: "grafite", humor: "fofoca", fala: "Não prometo nada." },
    { nome: "Presente com a data", desc: "O valor é 02/12/26. A gente não resistiu.", valor: 212.26,
      humor: "neutro", fala: "Essa foi ideia do Cauê." },
    { nome: "Primeiro jantar de casados", desc: "Em Milagres, pé na areia, sem ninguém lavando a louça.", valor: 250,
      humor: "ressalva", fala: "E eu janto onde?" },
    { nome: "Faculdade do primeiro filho", desc: "Para quem pergunta sobre filho e quer ajudar com a faculdade. (A Bianca nem está grávida.)", valor: 250,
      carimbo: ["Apolo é", "contra"], tinta: "terra", humor: "julga", fala: "Filho único está ótimo, obrigado." },
    { nome: "Um mês de ração", desc: "O Apolo pediu para colocar este no topo da lista.", valor: 290,
      carimbo: ["Sugerido", "pelo Apolo"], tinta: "verde", humor: "aprova", fala: "Ótima escolha. Fui eu que sugeri." },
    { nome: "Camisa nova do Botafogo", desc: "A antiga virou pano de chão. Vocês já sabem o que aconteceu com o pano.", valor: 350,
      carimbo: ["Apolo", "nega tudo"], tinta: "terra", humor: "nega", fala: "Não fui eu." },
    { nome: "Hotelzinho na lua de mel", desc: "Alguém precisa cuidar dele enquanto a gente finge que não está com saudade.", valor: 380,
      carimbo: ["Apolo tem", "ressalvas"], tinta: "grafite", humor: "ressalva", fala: "Vou pensar no seu caso." },
    { nome: "Upgrade na lua de mel", desc: "O Cauê planeja viagens esportivas o ano inteiro. Nesta, o único esporte é a rede.", valor: 500,
      humor: "neutro", fala: "Rede eu também curto." },
    { nome: "Valor livre", desc: "Para quem pulou a lista inteira e só quer fazer o Pix. Respeitamos.", valor: 0,
      humor: "julga", fala: "Pulou a lista inteira, né? Eu vi." }
  ];

  var $ = function (id) { return document.getElementById(id); };
  var Apolo = window.Apolo;
  var html = document.documentElement;

  function reais(v) {
    return "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 });
  }

  /* ---------- Código Pix (BR Code estático, padrão do Banco Central) ---------- */
  function semAcento(s) { return s.normalize ? s.normalize("NFD").replace(/[̀-ͯ]/g, "") : s; }
  function limpo(s, max) { return semAcento(String(s || "")).replace(/[^A-Za-z0-9 .,()-]/g, "").replace(/\s+/g, " ").trim().slice(0, max); }
  function campo(id, valor) { var t = String(valor.length); return id + (t.length < 2 ? "0" + t : t) + valor; }
  function crc16(s) {
    var crc = 0xFFFF;
    for (var i = 0; i < s.length; i++) {
      crc ^= s.charCodeAt(i) << 8;
      for (var b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
    }
    return ("000" + crc.toString(16).toUpperCase()).slice(-4);
  }
  function codigoPix(valor, descricao) {
    var conta = campo("00", "br.gov.bcb.pix") + campo("01", PIX.chave.trim());
    var info = limpo(descricao, Math.min(40, 99 - conta.length - 4));
    if (info) conta += campo("02", info);
    var p = campo("00", "01") + campo("26", conta) + campo("52", "0000") + campo("53", "986") +
      (valor ? campo("54", valor.toFixed(2)) : "") + campo("58", "BR") +
      campo("59", limpo(PIX.nome, 25) || "Bianca e Caue") + campo("60", limpo(PIX.cidade, 15) || "Rio de Janeiro") +
      campo("62", campo("05", "***")) + "6304";
    return p + crc16(p);
  }

  /* ---------- Carimbo redondo: texto em volta, pata no meio, tinta falhada ---------- */
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  var nCarimbo = 0;
  function carimboSVG(texto) {
    var id = "c" + (++nCarimbo);
    return '<svg viewBox="0 0 80 80" aria-hidden="true" focusable="false">' +
      '<defs><path id="' + id + 't" d="M11,40 A29,29 0 0 1 69,40"/><path id="' + id + 'b" d="M6,40 A34,34 0 0 0 74,40"/></defs>' +
      '<g filter="url(#tinta)">' +
        '<circle cx="40" cy="40" r="37" fill="none" stroke="currentColor" stroke-width="2.2"/>' +
        '<circle cx="40" cy="40" r="26.5" fill="none" stroke="currentColor" stroke-width="1"/>' +
        '<circle cx="8.5" cy="40" r="1.5" fill="currentColor"/><circle cx="71.5" cy="40" r="1.5" fill="currentColor"/>' +
        '<g fill="currentColor" font-family="Cormorant Garamond, Georgia, serif" font-weight="700" font-size="8.6" letter-spacing="1.1">' +
          '<text><textPath href="#' + id + 't" startOffset="50%" text-anchor="middle">' + esc(texto[0].toUpperCase()) + '</textPath></text>' +
          '<text><textPath href="#' + id + 'b" startOffset="50%" text-anchor="middle">' + esc(texto[1].toUpperCase()) + '</textPath></text>' +
        '</g>' +
        '<g fill="currentColor" transform="translate(28.5 27) scale(.96)">' +
          '<ellipse cx="12" cy="16" rx="5.2" ry="4.4"/><ellipse cx="5.2" cy="10.4" rx="2.3" ry="2.9"/><ellipse cx="9.4" cy="6.2" rx="2.3" ry="2.9"/>' +
          '<ellipse cx="14.6" cy="6.2" rx="2.3" ry="2.9"/><ellipse cx="18.8" cy="10.4" rx="2.3" ry="2.9"/>' +
        '</g>' +
      '</g></svg>';
  }
  var GIROS = [-9, 7, -4, 11, -12, 5, -7, 9, -3, 12, -10, 6];
  var SETA = '<svg viewBox="0 0 22 10" width="22" height="10" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" aria-hidden="true"><path d="M1 5h19M16 1.5l4 3.5-4 3.5"/></svg>';

  /* ---------- Cardápio: seções pela faixa de valor ---------- */
  var SECOES = [
    { nome: "Entradas", cabe: function (v) { return v > 0 && v <= 100; } },
    { nome: "Pratos principais", cabe: function (v) { return v > 100 && v <= 300; } },
    { nome: "Sobremesas", cabe: function (v) { return v > 300; } },
    { nome: "Fora do cardápio", cabe: function (v) { return !v; }, faixa: "o valor é com você" }
  ];
  var temCursor = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  $("dica").textContent = temCursor ? "Clique num presente para ver o Pix" : "Toque num presente para ver o Pix";

  var cardapio = $("cardapio"), numero = 0, observados = [];
  var comValor = SECOES.filter(function (s) { return !s.faixa; });
  SECOES.forEach(function (s) {
    var itens = PRESENTES.filter(function (p) { return s.cabe(p.valor); });
    if (!itens.length) return;
    if (!s.faixa) {
      var vals = itens.map(function (p) { return p.valor; });
      var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
      var i = comValor.indexOf(s);
      s.faixa = i === 0 ? "até " + reais(max) : i === comValor.length - 1 ? "a partir de " + reais(min) : "de " + reais(min) + " a " + reais(max);
    }
    var sec = document.createElement("section");
    sec.className = "secao";
    sec.innerHTML = '<header class="secao-titulo"><h2 class="secao-nome"></h2><p class="secao-faixa"></p></header><ul class="itens"></ul>';
    sec.querySelector(".secao-nome").textContent = s.nome;
    sec.querySelector(".secao-faixa").textContent = s.faixa;
    observados.push(sec.querySelector(".secao-titulo"));
    var ul = sec.querySelector(".itens");

    itens.forEach(function (p) {
      numero++;
      p.num = (numero < 10 ? "0" : "") + numero; p.secao = s.nome; p.giro = GIROS[(numero - 1) % GIROS.length];
      var li = document.createElement("li");
      var b = document.createElement("button");
      b.type = "button"; b.className = "item"; b.setAttribute("aria-haspopup", "dialog");
      b.innerHTML = '<span class="item-num"></span><span class="item-nome"><span class="item-nome-texto"></span><span class="pontos" aria-hidden="true"></span></span>' +
        '<span class="item-preco"></span><span class="item-desc"></span><span class="item-acao">Presentear ' + SETA + '</span>';
      b.querySelector(".item-num").textContent = p.num;
      b.querySelector(".item-nome-texto").textContent = p.nome;
      var val = b.querySelector(".item-preco");
      val.textContent = p.valor ? reais(p.valor) : "Você escolhe";
      if (!p.valor) val.classList.add("livre");
      b.querySelector(".item-desc").textContent = p.desc;
      b.addEventListener("click", function () { abrir(p, b); });
      // Computador: com o cursor em cima, o Apolo já faz a cara do carimbo
      b.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") Apolo.humor(p.humor === "pano" ? "aprova" : p.humor); });
      b.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") Apolo.humor(null); });
      li.appendChild(b);
      if (p.carimbo) {
        // O carimbo é desenho; o parecer também vai em texto para leitores de tela
        var sr = document.createElement("span");
        sr.className = "sr"; sr.textContent = "Parecer: " + p.carimbo.join(" ") + ".";
        b.appendChild(sr);
        var c = document.createElement("span");
        c.className = "carimbo " + (p.tinta || "verde");
        c.style.setProperty("--giro", p.giro + "deg");
        c.innerHTML = carimboSVG(p.carimbo);
        li.appendChild(c);
        li.classList.add("com-carimbo");
      }
      ul.appendChild(li);
      observados.push(li);
    });
    cardapio.appendChild(sec);
  });

  // Linhas aparecem em sequência conforme entram na tela
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entradas) {
      entradas.filter(function (e) { return e.isIntersecting; }).forEach(function (e, i) {
        e.target.style.setProperty("--atraso", i * 90 + "ms");
        e.target.classList.add("visto");
        io.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    observados.forEach(function (el) { io.observe(el); });
  } else {
    observados.forEach(function (el) { el.classList.add("visto"); });
  }

  /* ---------- Retrato: foto do Apolo quando existir; até lá, o desenho ---------- */
  var moldura = $("moldura");
  Apolo.retrato(moldura);
  var foto = new Image();
  foto.alt = "O Apolo, nosso golden retriever";
  foto.onload = function () { moldura.appendChild(foto); };
  foto.src = "apolo.jpg";

  /* ---------- Quadro do presente ---------- */
  var fundo = $("modal-fundo"), modal = $("presente"), caixa = modal.querySelector(".modal-caixa");
  var copiar = $("m-copiar"), copiarChave = $("m-copiar-chave"), qrBox = $("m-qr"), campoCodigo = $("m-codigo");
  var atual = null, origem = null, codigo = "", timerFechar, timerBotao;
  var computador = function () { return window.matchMedia("(min-width: 700px) and (hover: hover)").matches; };

  var seloModal = $("m-carimbo");
  function abrir(p, botao) {
    atual = p; origem = botao;
    $("m-rotulo").textContent = "Nº " + p.num + " · " + p.secao;
    seloModal.innerHTML = p.carimbo ? carimboSVG(p.carimbo) : "";
    seloModal.className = "modal-carimbo " + (p.tinta || "verde");
    seloModal.style.setProperty("--giro", (p.giro || -8) + "deg");
    caixa.classList.toggle("com-selo", !!p.carimbo);
    $("m-nome").textContent = p.nome;
    var val = $("m-valor");
    val.textContent = p.valor ? reais(p.valor) : "Você escolhe o valor";
    val.classList.toggle("livre", !p.valor);
    $("m-desc").textContent = p.desc;

    var temChave = !!PIX.chave.trim();
    $("m-pix").hidden = !temChave;
    $("m-embreve").hidden = temChave;
    campoCodigo.hidden = true;
    copiar.textContent = "Copiar código Pix"; copiar.classList.remove("feito");
    copiarChave.textContent = "copiar chave";
    if (temChave) {
      codigo = codigoPix(p.valor, p.nome);
      $("m-chave").textContent = PIX.chave.trim();
      $("m-ajuda").textContent = (computador() ? "Leia o QR Code no app do banco ou copie o código e use Pix copia e cola." :
        "No app do banco, escolha Pix copia e cola e cole o código.") +
        (p.valor ? " O valor já vem preenchido." : " O valor você digita no app.");
      desenharQR(codigo);
    }

    clearTimeout(timerFechar);
    fundo.hidden = false; modal.hidden = false;
    html.classList.add("travado");
    requestAnimationFrame(function () { fundo.classList.add("aberto"); modal.classList.add("aberto"); });
    (temChave ? copiar : caixa).focus({ preventScroll: true });
    Apolo.abrirPresente(caixa, p);
  }

  function fechar() {
    if (!atual) return;
    atual = null;
    fundo.classList.remove("aberto"); modal.classList.remove("aberto");
    html.classList.remove("travado");
    timerFechar = setTimeout(function () { fundo.hidden = true; modal.hidden = true; }, 320);
    if (origem) origem.focus({ preventScroll: true });
    Apolo.fecharPresente();
  }

  [].forEach.call(document.querySelectorAll("[data-fechar]"), function (el) { el.addEventListener("click", fechar); });
  fundo.addEventListener("click", fechar);
  document.addEventListener("keydown", function (e) {
    if (!atual) return;
    if (e.key === "Escape") { e.preventDefault(); fechar(); return; }
    if (e.key !== "Tab") return;
    // Mantém o foco dentro do quadro
    var focaveis = [].filter.call(caixa.querySelectorAll("button, a[href], textarea"), function (el) {
      return !el.disabled && el.offsetParent !== null;
    });
    if (!focaveis.length) return;
    var primeiro = focaveis[0], ultimo = focaveis[focaveis.length - 1];
    if (e.shiftKey && (document.activeElement === primeiro || document.activeElement === caixa)) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
  });

  /* ---------- Copiar ---------- */
  // Tenta a área de transferência moderna; se o navegador recusar, o jeito antigo
  function copiarAntigo(txt) {
    var ta = document.createElement("textarea");
    ta.value = txt; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    var feito = false;
    try { feito = document.execCommand("copy"); } catch (e) {}
    ta.remove();
    return feito ? Promise.resolve() : Promise.reject();
  }
  function copiarTexto(txt) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(txt).catch(function () { return copiarAntigo(txt); });
    }
    return copiarAntigo(txt);
  }
  copiar.addEventListener("click", function () {
    copiarTexto(codigo).then(function () {
      copiar.textContent = "Código copiado"; copiar.classList.add("feito");
      clearTimeout(timerBotao);
      timerBotao = setTimeout(function () { copiar.textContent = "Copiar código Pix"; copiar.classList.remove("feito"); }, 2800);
      Apolo.comemorar("Pix copiado. Já fui contar pra família toda.");
    }, function () {
      // Sem acesso à área de transferência: mostra o código para copiar à mão
      campoCodigo.value = codigo; campoCodigo.hidden = false;
      campoCodigo.focus(); campoCodigo.select();
    });
  });
  copiarChave.addEventListener("click", function () {
    copiarTexto(PIX.chave.trim()).then(function () { copiarChave.textContent = "chave copiada"; }, function () {});
  });

  /* ---------- QR Code (só no computador; no celular o caminho é o copia e cola) ---------- */
  var esperandoQR = null;
  function carregarQR(pronto) {
    if (window.qrcode) return pronto();
    if (esperandoQR) { esperandoQR.push(pronto); return; }
    esperandoQR = [pronto];
    var s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js";
    s.onload = function () { esperandoQR.forEach(function (f) { f(); }); esperandoQR = null; };
    s.onerror = function () { esperandoQR = null; };
    document.head.appendChild(s);
  }
  function desenharQR(texto) {
    qrBox.classList.remove("pronto"); qrBox.innerHTML = "";
    if (!computador()) return;
    carregarQR(function () {
      if (!atual || codigo !== texto) return;
      var q = window.qrcode(0, "M"); q.addData(texto); q.make();
      qrBox.innerHTML = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
      qrBox.classList.add("pronto");
    });
  }

  // Exposto para conferência no console
  window.Presentes = { codigoPix: codigoPix, crc16: crc16 };
})();
