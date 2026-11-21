# Convite de Bianca e Cauê

Site estático, sem instalação e sem etapa de build.

Publicado em https://caueissa.github.io/convite-bianca-caue/

## Trocar o convite em imagem

Substitua `convite-final.jpg` mantendo o mesmo nome.

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
carimbo do Apolo em duas linhas (`["Aprovado", "pelo Apolo"]`: em cima e embaixo do selo),
cor do carimbo (`"verde"`, `"terra"` ou `"grafite"`), humor (como o Apolo reage: `aprova`,
`julga`, `nega`, `ressalva`, `fofoca`, `neutro` ou `pano`) e a fala dele.

A lista aparece como um cardápio, separada pelo valor: Entradas (até R$ 100), Pratos principais
(até R$ 300), Sobremesas (acima disso) e Fora do cardápio (valor livre). As faixas de cada seção
são calculadas sozinhas a partir dos valores.

### Foto do Apolo

Coloque a foto na pasta com o nome `apolo.jpg` (em pé, proporção 4:5 fica melhor).
Enquanto ela não existir, o retrato mostra o desenho do Apolo.

### O ramo do cabeçalho

`ramo.js` desenha o mesmo ramo de eucalipto em aquarela do convite (mesmas folhas de
`cenario.js`), parado, uma única vez.

### O Apolo

`apolo.js` desenha e anima o Apolo que anda pelo chão da página de presentes.
No computador ele segue o cursor; no celular corre até onde a pessoa toca e,
tocado, pula e conta uma fofoca. Ele reage a cada presente aberto e comemora quando
alguém copia o Pix. Quem usa "reduzir movimento" no aparelho vê o Apolo parado.

### Música da lista

`musica.js` toca uma música alegre composta para a página (ukulele, glockenspiel,
kalimba, baixinho e chocalho, em Fá maior), gerada pelo navegador, sem arquivo de áudio.
Ela começa pelo botão "Música" no canto da página. Quem entrou no convite com som ouve
a música no primeiro toque na lista. Com a música tocando, o Apolo balança a cabeça no ritmo.
