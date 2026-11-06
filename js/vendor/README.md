# Runtime existente do Tailwind, fixado localmente

A demonstração já dependia do runtime CDN do Tailwind. Com autenticação no mesmo servidor, o JavaScript remoto foi substituído pela cópia local da versão 3.4.17, preservando a configuração e o layout existentes. A área do laboratório utiliza CSS próprio, sem esse runtime.

- Origem consultada em 22/10/2026: https://cdn.tailwindcss.com/3.4.17
- Arquivo sem alterações: tailwind-runtime-3.4.17.js (407279 bytes).
- SHA-256: 176e894661aa9cdc9a5cba6c720044cbbf7b8bd80d1c9a142a7c24b1b6c50d15
- Licença: TAILWIND-LICENSE.txt, obtida de https://raw.githubusercontent.com/tailwindlabs/tailwindcss/v3.4.17/LICENSE (MIT).

Os CSS/fontes externos já existentes continuam na demonstração. Não há código JavaScript executável carregado de terceiros na página autenticada do laboratório; sua CSP permite scripts somente da própria origem. Uma evolução futura pode pré-compilar o CSS da demonstração para eliminar também o runtime local.
