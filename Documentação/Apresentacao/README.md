# Documentos de apresentação JUSTEC — 22/10/2026

Dois documentos, cada um em Word editável, PDF para compartilhamento e Markdown para histórico no GitHub:

1. **01_ATUALIZACAO_LABORATORIO_JUSTEC** — o que mudou, comparação antes/depois, arquitetura, funcionamento dos módulos novos, testes, preservação e infraestrutura. PDF: 10 páginas.
2. **02_SISTEMA_COMPLETO_E_PROPOSTA_JUSTEC** — sistema completo, experiência educativa, Pix, contas, Guard, pesquisa, segurança, limites e proposta de piloto empresarial. PDF: 14 páginas.

Os arquivos Word têm sumário por campos: no Microsoft Word, atualizar campos/sumário ao abrir para recalcular paginação. A paginação pode variar conforme fontes e editor; o PDF fixa a versão para apresentação. As fontes Markdown são a referência de conteúdo. A imagem é captura real de teste local com dados sintéticos, não publicação em produção.

Material preparado a partir do código e dos ensaios, sem inventar resultados de eficácia, clientes, certificações, orçamento ou jurisprudência. A proposta empresarial é de piloto a negociar; não contrato, parecer jurídico ou autorização de integração financeira.

Geração desta edição: Pandoc 3.1.11.1, python-docx para estilos Word e Chromium para PDF. Essas ferramentas são editoriais e não dependências de execução do sistema.

Consultar [publicação e separação das versões](../../deploy/README.md) e o [Relatório-Mestre](../../RELATORIO_MESTRE_JUSTEC.md) para estado da infraestrutura. As branchs foram separadas; aplicação de blueprint no Render e validação da URL dependem do painel do titular.

Atualização posterior: os arquivos Word/PDF acima são o retrato da entrega inicial SQLite. O suporte PostgreSQL e o blueprint Render Free foram acrescentados depois; consultar o [adendo técnico PostgreSQL](../ATUALIZACAO_POSTGRESQL_RENDER_FREE_2026-10-22.md) para apresentar a arquitetura atual. Não apresentar a antiga pendência de implementação PostgreSQL como ainda existente; a pendência atual é provisionar/conectar os serviços e validar a URL pública.
