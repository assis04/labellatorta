# Pendências com o cliente

O site está pronto para publicar com o que é fato hoje. O que falta abaixo **não aparece inventado** no site:
quando um dado é `null`, a interface diz "consulte pelo WhatsApp" e o schema simplesmente omite o campo.
Cada item indica onde preencher — muda em um lugar, atualiza página, dados estruturados e `llms.txt` juntos.

| #   | O que pedir                                                | Onde preencher                                    | Por que importa                                                                           |
| --- | ---------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1   | Preço da fatia e da torta inteira de cada sabor            | `src/data/menu.ts` → `price`                      | É a primeira pergunta de quem busca; vira `Offer` no schema e aparece em resultados ricos |
| 2   | Preço e composição do almoço (fatia + salada)              | `src/data/menu.ts` / página `/almoco/`            | Captura buscas de "almoço Parque São Jorge" com resposta completa                         |
| 3   | Tamanhos da torta inteira e quantas fatias rendem          | `src/data/menu.ts` + FAQ em `src/data/content.ts` | Pergunta frequente de encomenda                                                           |
| 4   | Entrega: própria, iFood ou 99Food? Bairros e taxa          | `src/data/content.ts` (FAQ) e seção de delivery   | Hoje o site diz "combine pelo WhatsApp"                                                   |
| 5   | Antecedência mínima para encomenda                         | FAQ + `/encomendas/`                              | Evita pedido impossível                                                                   |
| 6   | Formas de pagamento (Pix, cartões, vale-refeição)          | FAQ + `paymentAccepted` no schema                 | Pergunta comum no almoço                                                                  |
| 7   | CEP do endereço                                            | `src/data/business.ts` → `address.postalCode`     | Completa o endereço no schema                                                             |
| 8   | Ano de fundação e quem fundou (com autorização)            | `business.foundedYear` + página `/sobre/`         | Credibilidade (E-E-A-T) para Google e IAs                                                 |
| 9   | Logotipo em vetor (SVG/AI)                                 | `public/` + `Header.astro`                        | Hoje o logo é tipográfico                                                                 |
| 10  | Fotos novas: fachada, salão com clientes, equipe           | `src/assets/fotos/`                               | As de produto já são boas; falta "lugar e gente"                                          |
| 11  | Avaliações reais do Google autorizadas para o site         | `src/data/content.ts` → `reviews`                 | A seção mostra um convite ao Google enquanto estiver vazia                                |
| 12  | Link curto do Perfil da Empresa no Google                  | `src/data/business.ts` → `links.googleReviews`    | Botão "ver avaliações" vai direto ao perfil                                               |
| 13  | "Na Mídia": veículos e links das matérias                  | nova seção em `/sobre/`                           | Menção de terceiros é o sinal que as IAs mais valorizam                                   |
| 14  | Confirmar que shimeji, palmito e brócolis são vegetarianas | `src/data/menu.ts` → `tags`                       | O site afirma isso hoje com base nos ingredientes                                         |

## Fora do site (maior alavanca de SEO local)

1. **Perfil da Empresa no Google**: categorias, fotos, cardápio, horários idênticos aos do site, posts semanais, responder todas as avaliações.
2. **Avaliações**: QR code na caixa da torta e na mesa apontando para "avaliar no Google".
3. **Bing Places** (alimenta ChatGPT Search e Copilot) e **Apple Business Connect** (Siri e Apple Maps).
4. **Nome, endereço e telefone idênticos** em todo lugar: site, Google, Instagram, iFood, Facebook, Restaurant Guru, TripAdvisor.
5. **Link da bio do Instagram** apontando para o site.
