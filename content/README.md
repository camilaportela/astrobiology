# Conteúdo da Prova Prática (Cards Game)

Este projeto carrega os **cards do tipo `game`** a partir do arquivo:

- `content/flashcards-pratica.json`

O 1º card (capa do microscópio) continua fixo no código. Tudo daqui para frente é só para os cards `game`.

## Como editar

1. Abra `content/flashcards-pratica.json` no Bloco de Notas.
2. Dentro de `"games": [ ... ]`, cada bloco `{ ... }` é **um card**.
3. Para adicionar um card novo: copie um bloco inteiro, cole abaixo, e edite os campos.
4. Salve.

Importante: para o navegador conseguir carregar esse JSON, rode o site via servidor local (`http://localhost`).

## Campos do card

### `img` (obrigatório)
- URL da imagem do card.
- Exemplo: `"https://i.imgur.com/abc123.png"`

### `anadixSpeech` (opcional)
- Texto do balão da Anadix para esse card.
- Aceita HTML simples: `"<b>negrito</b>"` e `"<br>"` para quebrar linha.
- Se estiver vazio, o projeto usa uma mensagem padrão.

### `references` (obrigatório)
Lista de opções que aparecem no painel da direita.

Formato:

```json
"references": [
  { "id": 1, "label": "Xilema" },
  { "id": 2, "label": "Floema" }
]
```

Regras:
- `id` precisa ser único dentro do card (pode ser número ou texto).
- `label` é o texto mostrado.

### `hotspots` (opcional)
Lista de pontos clicáveis sobre a imagem.

Formato:

```json
"hotspots": [
  { "id": "h1", "top": "48%", "left": "52%", "correctRefId": 1 }
]
```

Regras:
- `top` e `left` devem ser strings com `%` (ex.: `"48%"`).
- `correctRefId` deve existir em `references[].id`.

## Como escolher as coordenadas (`top`/`left`)

- Pense como um grid em porcentagem em cima da imagem.
- `top: "0%"` é o topo, `top: "100%"` é a parte de baixo.
- `left: "0%"` é a esquerda, `left: "100%"` é a direita.

Dica prática:
- Abra o card no navegador.
- Ajuste os valores em `content/flashcards-pratica.json` e recarregue a página.
- Repita até o ponto ficar exatamente onde você quer.

## Erros comuns

- **Hotspot não valida**: `correctRefId` não existe em `references`.
- **Nada carrega**: abrindo por `file://` (use `http://localhost`).
- **Imagem não aparece**: URL errada ou imagem bloqueada (CORS/hotlink).

## Frases do Resultado (balões das estrelas)

No topo do arquivo existe a seção `"result"`. Ela controla as mensagens do card de Resultado:

```json
"result": {
  "hint": "Mova o robô para coletar a estrela.",
  "anadixSpeech": "Texto do balão da Anadix no Resultado.",
  "celebrateMessage": "Parabéns! Continue assim.",
  "sadMessages": [
    "Fiquei triste, precisa estudar mais.",
    "Acredito na sua capacidade.",
    "Você consegue!"
  ]
}
```

Regras:
- `sadMessages` define quantas estrelas vão aparecer no modo triste (uma estrela por frase).
- Se `result` não existir, o sistema usa frases padrão.
- Para remover a dica do Resultado, defina `"hint": ""`.
- `anadixSpeech` define o texto do balão da Anadix no Resultado (aceita `<br>` e HTML simples).
