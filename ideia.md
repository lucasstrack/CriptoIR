Preciso desenvolver uma aplicação web simples e que rode localmente para facilitar a busca por transações de criptomoedas efetuadas na blockchain.
Essa aplicação deve buscar nas blockchains pelos endereços de carteira indicados e retornar todas as transações encontradas trazendo informações relevantes como:
- Data/hora da transação
- Origem
- Destino
- Criptomoeda transacionada
- Valor da transação
- Valor de taxas
- Dentre outras informações uteis
A aplicação deve possuir um banco de dados local, que pode ser SQLITE para armazenar os dados de transações e carteiras de criptomoedas do usuário
Uma das telas precisa ser uma listagem estilo excel que possibilite filtrar os dados, como data, criptomoeda, dentre outros

As redes de blockchain suportadas devem ser:
- BTC
- ETH
- BASE
- SOL
- ARB
- No futuro deve ser possivel adicionar suporte a outras redes

Outra tela precisa ser um agregador de patrimonio, desejo saber quais criptomoedas tenho em carteira e qual o seu preço médio assim como o valor do meu patrimonio no dia atual
Podem ser criados gráficos interativos mostrando a evolução da carteira, podem existir filtros para indicar por cripto, por carteira e por período

Lembre-se que a busca dos dados das blockchains precisa ser otimizada e os dados devem ser armazenados localmente
A busca deve ser otimizada, levando em conta que a blockchain é imutavel e cada transação precisa ser retornada apenas uma vez.
A UI/UX da aplicação deve ser focada na facilidade de uso da aplicação para o usuário final.
Preciso que seja utilizado como base para interface um tema escuro de aparencia moderna.
Pode ser utilizada uma biblioteca de frontend consolidada de sua preferencia.

Gostaria que o sistema fosse desenvolvido com node.js ou next.js e typescript. 

A arquitetura do sistema deve facilitar o desenvolvimento das funcionalidades atuais e permitir novas funções
O sistema precisa ser API FIRST e cada novo endpoint precisa ser documentado em um arquivo MD centralizado
Todas as funções precisam ter testes unitários e de integração para cada funcionalidade.
Um agente deve ser capaz de desenvolver a tarefa, efetuar o commit da funcionalidade e outro agente deve fazer os testes e review
Primeiro deve ser feita a análise de como será a estrutura do projeto e validado comigo.
Posteriormente devem ser criados planos de execução, permitindo que mais de um agente realize tarefas simultâneas
Cada tarefa precisa ter entregaveis reais e que possam ser validados por um segundo agente para garantir que o que foi planejado realmente funcionou
Tudo precisa estar documentado no projeto, incluindo decisões técnicas tomadas durante o desenvolvimento.

