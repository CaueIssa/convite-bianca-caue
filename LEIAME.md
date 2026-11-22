# Convite de Bianca e Cauê

Site estático, sem instalação e sem etapa de build.

Publicado em https://caueissa.github.io/convite-bianca-caue/

## O convite

O convite é só para o almoço: quarta-feira, 02/12/2026, às 13h30, no Salão de Festa Hype
(Rua Cesar Lattes, 260). Os textos ficam em `index.html`. No fim, dois botões: "Lista de
presentes" e "Baixar imagem".

A tela de entrada mostra o monograma do casal (o mesmo da lista de presentes, em SVG dentro
de `index.html`): o raminho balança como numa brisa e a estrela cintila. As cores e a
animação ficam em `estilo.css` (`.lg-letras`, `.lg-ramo`, `.lg-estrela`). O mesmo monograma
aparece clarinho atrás de "Bianca + Cauê" no convite (`#mono` em `index.html`, cores em `.mn-*`):
surge com a rolagem, com o raminho vindo da esquerda e a estrela da direita. A imagem
`convite-final.jpg` usa o mesmo monograma. Quem usa "reduzir movimento" vê tudo parado.

## Trocar o convite em imagem

Substitua `convite-final.jpg` mantendo o mesmo nome. É a imagem do botão "Baixar imagem" e
da prévia do link no WhatsApp. Ao trocar, aumente o número em `convite-final.jpg?v=3` no
`og:image` de `index.html` para o WhatsApp buscar a prévia nova.

## Lista de presentes

Página `presentes.html`, aberta pelo botão "Lista de presentes" no fim do convite.
Link direto: https://caueissa.github.io/convite-bianca-caue/presentes.html

### Colocar a chave Pix

No topo de `presentes.js`, preencha `chave` dentro de `PIX` e confira `nome` e `cidade`.
Enquanto a chave estiver vazia, o quadro do presente mostra "A chave Pix chega em breve".

Formatos da chave: celular com +55 e DDD (`+5521999999999`), e-mail, CPF só com números
ou a chave aleatória.

Antes de divulgar, teste: abra um presente, copie o código, cole no app do banco em
"Pix copia e cola" e confira o nome e o valor, sem confirmar o pagamento.

### Editar os presentes

Lista `PRESENTES` em `presentes.js`. Cada item tem nome, descrição, valor (`0` = valor livre),
humor (como o Apolo reage: `aprova`, `julga`, `nega`, `ressalva`, `fofoca`, `neutro` ou `pano`)
e a fala dele. Opcionalmente, um carimbo do Apolo em duas linhas (`["Aprovado", "pelo Apolo"]`:
em cima e embaixo do selo) e a cor do carimbo (`"verde"`, `"terra"` ou `"grafite"`).

A lista aparece numa coluna só, sempre do menor valor para o maior, com o valor livre no fim.
A ordem é feita sozinha; não importa em que ordem os itens estão no arquivo.

### Foto do casal

O retrato em arco, ao lado do recado, usa `casal.jpg` (proporção 4:5). Para trocar,
substitua o arquivo mantendo o nome. O texto do recado fica em `presentes.html`.

### Monograma

O monograma do cabeçalho (raminho, arco com o B, C com cauda e estrelinha) foi contornado
em vetor a partir do monograma original do casal. Fica em SVG dentro de `presentes.html`; as
cores vêm de `presentes.css` (`.mg-ramo`, `.mg-letras` e `.mg-estrela`).

### O Apolo

`apolo.js` desenha e anima o Apolo que anda pelo chão da página de presentes.
No computador ele segue o cursor; no celular corre até onde a pessoa toca e,
tocado, pula e conta uma fofoca. Quando um presente é aberto, ele vai até o espaço livre
ao lado do quadro, senta e só então comenta; o balão fica na frente do quadro, com tempo
para ler. Ele também comemora quando alguém copia o Pix. Quem usa "reduzir movimento" no aparelho vê o Apolo parado.

### Música da lista

`musica.js` toca uma música alegre composta para a página (ukulele de nylon, piano macio,
marimba, baixinho e chocalho, em Fá maior), gerada pelo navegador, sem arquivo de áudio.
Ela começa sozinha quando a pessoa entra na lista, e o botão "Música" no canto liga e
desliga. Vindo do convite pelo botão "Lista de presentes", o Chrome (computador e Android)
toca na hora. No iPhone, ou abrindo o link direto, o navegador exige um gesto antes de
qualquer som: a música começa no primeiro toque, clique ou tecla na página. Fica quieta se
a pessoa escolheu "Entrar sem som" no convite ou desligou a música na lista. Com a música
tocando, o Apolo balança a cabeça no ritmo.
