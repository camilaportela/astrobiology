---
layout: post
title: "Postagem de teste"
date: 2026-05-14
author: "Camila Portela"
subtitle: "Este é um subtítulo de teste para validar o layout editorial do site."
image: "/assets/img/planets/2k_stars_milky_way.jpg"
category: noticias
banner: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=1600&q=80"
excerpt: "Esta é uma postagem de teste para validar a estrutura editorial do site."
featured: true
---

## Introdução

Esta é uma postagem de teste criada para validar a estrutura editorial do site usando Jekyll. A estrutura foi criada em paralelo ao site atual, mantendo a página inicial intacta enquanto testamos os layouts e componentes do novo sistema.

## Validação

O layout editorial deve mostrar:

- **Metadados no topo**: autor e data
- **Título grande serifado**: "Postagem de teste"
- **Subtítulo em itálico**: "Este é um subtítulo de teste..."
- **Corpo em coluna editorial**: com tipografia Georgia
- **Comentários no final**: widget Giscus com `data-mapping="pathname"`

## Estrutura Jekyll

A estrutura criada inclui:

- `_config.yml`: Configuração do Jekyll
- `_layouts/default.html`: Layout base que reutiliza todos os links CSS/JS
- `_layouts/post.html`: Layout de artigos baseado no design editorial atual
- `_includes/giscus.html`: Widget Giscus reutilizável
- `_posts/`: Pasta para artigos em Markdown

## Próximos Passos

Uma vez validado, novos artigos podem ser criados adicionando arquivos Markdown em `_posts/`.

Cada artigo gerará sua própria página e thread de comentários separada no GitHub Discussions.

**Está tudo funcionando corretamente!**
