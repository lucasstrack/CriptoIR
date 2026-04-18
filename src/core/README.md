# Core

Esta camada concentra regras de dominio puras.

- Nao depende de Next.js nem Prisma.
- Deve conter entidades, servicos e use cases testaveis sem IO externo.
- Toda integracao com banco, HTTP ou providers fica fora daqui.
