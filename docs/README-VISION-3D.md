# JUSTEC Immersive — visão experimental de apresentação 3D

**Data de registro:** 19/11/2026  
**Última revisão:** 19/11/2026  
**Versão da visão:** 0.1  
**Status:** proposta conceitual, não vinculante  
**Ambiente previsto:** Preview — redesign/experience-v2

## 1. Natureza e precedência

Este documento registra uma visão de desenvolvimento discutida em 19/11/2026. Não constitui especificação definitiva, requisito obrigatório, ordem de implementação, compromisso de entrega ou descrição de funcionalidades prontas.

As decisões posteriores do responsável pelo projeto prevalecem sobre este registro. Em caso de divergência, seguir a orientação mais recente, sem tentar restaurar automaticamente os conceitos aqui descritos. É permitido revisar, substituir, adiar ou abandonar integralmente qualquer proposta. A existência deste documento não autoriza alterações na produção.

## 2. Objetivo conceitual

Explorar um modo de apresentação tridimensional cinematográfico para demonstrar o funcionamento do banco digital acadêmico JUSTEC Bank, seus mecanismos de prevenção de fraudes, a jornada das operações e suas implicações jurídicas.

A referência de direção artística é Igloo (https://igloo.inc/), especialmente sua linguagem espacial, movimentos de câmera, transições, partículas, iluminação e transformação de objetos. A intenção é desenvolver identidade própria, sem copiar ativos, código ou marca de terceiros.

O modo bancário convencional deverá permanecer distinto da experiência experimental. JUSTEC Immersive — Beyond Banking é um nome provisório.

## 3. Possíveis capítulos

| Capítulo | Visão ilustrativa |
| --- | --- |
| Nascimento da JUSTEC | Partículas douradas formam o símbolo tridimensional do banco. |
| Anatomia do sistema | Estruturas se desmembram em camadas de contas, operações, segurança e registros. |
| Jornada do dinheiro | Uma transferência simulada percorre visualmente a infraestrutura bancária. |
| JUSTEC Guard | Um escudo revela as etapas de análise, indicadores e justificativas. |
| Interceptação de fraude | Uma operação suspeita encontra uma barreira, expondo os motivos de uma eventual interrupção. |
| Direito e responsabilidade | Representação visual de proteção do consumidor, responsabilidade, contestação e revisão de decisões. |

Os capítulos, sua ordem, metáforas, estética e narrativa são sugestões revisáveis.

## 4. Modalidades possíveis

- Automática: percurso cinematográfico com sequência de capítulos.
- Guiada: navegação por rolagem, seleção de capítulos e movimentos de câmera.
- Interativa: operações fictícias alimentam a visualização por eventos do motor bancário.

A ambição é visualizar o comportamento efetivo do simulador, não apenas apresentar animações previamente gravadas. A representação deve distinguir eventos reais do motor simulado de cenas meramente ilustrativas. Uma eventual interrupção deve refletir a decisão efetivamente tomada pelo Guard, não rotular automaticamente toda suspeita como fraude.

## 5. Direção artística

Explorar a identidade existente da JUSTEC: azul profundo, fundo escuro e dourado; objetos tridimensionais, partículas, iluminação, transições cinematográficas e movimentos de câmera. A composição poderá ser alterada mediante experimentação e aprovação.

## 6. Hipóteses técnicas

| Recurso candidato | Possível finalidade |
| --- | --- |
| Three.js / WebGL | Renderização tridimensional no navegador |
| GSAP / ScrollTrigger | Sincronização de animações com navegação |
| GLSL | Efeitos gráficos e partículas |
| Blender | Modelagem de objetos próprios |
| glTF / GLB | Distribuição otimizada de modelos |
| Event Bus ou mecanismo equivalente | Integração entre eventos do simulador e visualização |

Nenhuma biblioteca ou arquitetura está determinada. Avaliar compatibilidade com o código existente, licenças, desempenho, manutenção e custos antes de escolher dependências.

## 7. Experiência e viabilidade

Considerar carregamento sob demanda, níveis gráficos adaptativos, alternativa 2D, opção de movimento reduzido, navegação acessível e funcionamento em celulares modestos. O modo convencional não deve depender do carregamento da experiência 3D.

A qualidade visual da referência não é uma entrega garantida. Complexidade artística, desempenho e integração são questões a investigar em protótipos.

Todo o ambiente é acadêmico: dados e operações fictícios, sem movimentação financeira real, sem integração bancária real presumida e sem exposição de dados pessoais.

## 8. Caminho experimental possível (não obrigatório)

1. Experimentar uma cena isolada no Preview.
2. Validar linguagem visual e desempenho.
3. Explorar navegação entre capítulos.
4. Conectar uma jornada Pix simulada aos eventos existentes, caso seja viável.
5. Explorar integração com Guard e demais módulos conforme decisões futuras.
6. Submeter o resultado à avaliação do responsável antes de eventual publicação.

Não há prazo obrigatório nem autorização de merge na main. A branch experimental é o local previsto para testar propostas; qualquer publicação definitiva depende de aprovação expressa.

## 9. Histórico de revisões

| Data | Versão | Registro |
| --- | --- | --- |
| 19/11/2026 | 0.1 | Registro inicial da visão de apresentação 3D inspirada na linguagem visual do Igloo. |

Em revisões futuras, registrar a data, a versão e a descrição da mudança, distinguindo ideias, decisões aprovadas e funcionalidades efetivamente implementadas. Este histórico documenta a evolução do pensamento, não congela o projeto.
