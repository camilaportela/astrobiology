# Instruções permanentes para este projeto

Este projeto é o site `astrobiology.me`, publicado via GitHub Pages.

Sempre que eu pedir qualquer alteração visual, funcional ou estrutural no site, siga este fluxo:

1. Faça a alteração solicitada com o menor impacto possível.

2. Preserve, salvo ordem explícita em contrário:
   - `CNAME`;
   - `_posts/`;
   - `_layouts/post.html`;
   - `_includes/giscus.html`;
   - sistema de comentários Giscus/GitHub Discussions;
   - URLs individuais dos posts;
   - página `/noticias/`.

3. Sempre que alterar CSS ou JS, faça cache busting no `index.html`:
   - incremente o parâmetro `?v=` dos arquivos CSS/JS alterados;
   - exemplo: `redesign.css?v=1` vira `redesign.css?v=2`;
   - exemplo: `redesign-background.js?v=1` vira `redesign-background.js?v=2`.

4. Depois de concluir as alterações, execute ou prepare automaticamente:

```powershell
git status
git add .
git commit -m "Atualiza site e força cache busting"
git push origin main
```

5. Se o commit não puder ser feito automaticamente, mostre exatamente os comandos que devo executar.

6. Ao final, sempre confirme:

   * arquivos alterados;
   * cache busting aplicado;
   * commit realizado ou comandos pendentes;
   * se o push foi enviado para `main`.

7. Quando eu pedir redesign visual, faça uma etapa por vez e evite reescrever o projeto inteiro sem necessidade.

8. Não remova arquivos importantes sem pedir confirmação. Prefira desconectar da homepage antes de apagar.
