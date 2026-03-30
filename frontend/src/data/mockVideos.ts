/* eslint-disable @stylistic/max-len */
export type { Video, VideoId } from '@models/video';
export { VideoStatus } from '@models/video';
export type { ChannelId } from '@models/channel';
export type { Tag } from '@models/tag';

import type { Video, VideoId } from '@models/video';
import type { ChannelId } from '@models/channel';
import type { Tag } from '@models/tag';

const CHANNELS: Record<string, string> = {
    ch_1: 'CodeWithPedro',
    ch_2: 'DesignLab',
    ch_3: 'AlphaDevs',
    ch_4: 'MusicMakers',
    ch_5: 'TravelDiaries',
    ch_6: 'GamersHub',
    ch_7: 'ScienceNow',
    ch_8: 'CookingByAna',
    ch_9: 'MLFoundry',
    ch_10: 'DockerOps',
    ch_11: 'TypescriptPro',
    ch_12: 'FrontendFocus',
    ch_13: 'BackendBeats',
    ch_14: 'CSSArtisan',
    ch_15: 'PythonLabs',
};

function v(
    id: string,
    title: string,
    description: string,
    tags: string[],
    channelId: string,
    views: number,
    publishedAt: string,
    status: 'published' | 'scheduled' = 'published',
    scheduledAt?: string,
    duration?: number,
): Video {
    return {
        id: id as VideoId,
        title,
        description,
        tags: tags as Tag[],
        thumbnail: `https://picsum.photos/seed/${id}/320/180`,
        publishedAt,
        scheduledAt,
        channel: CHANNELS[channelId],
        channelId: channelId as ChannelId,
        views,
        status,
        duration,
    };
}

// Publicly available sample videos (open-source, CC-licensed) cycled across all entries
const SAMPLE_VIDEO_LIST = [
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4',
];

const RAW_VIDEOS: Video[] = [
    // --- CodeWithPedro (ch_1) — React & Frontend ---
    v('v001', 'React 19 Concurrent Features Deep Dive', 'Exploramos as novidades do React 19: use(), transitions, e o novo compilador. Cobertura completa com exemplos práticos e comparações de performance.', ['react', 'frontend', 'javascript', 'performance'], 'ch_1', 184200, '2026-03-07T10:00:00Z', 'published', undefined, 2731),
    v('v002', 'Construindo um Design System com React e CSS Variables', 'Como criar um design system escalável utilizando tokens CSS e componentes React reutilizáveis. Do zero ao deploy.', ['react', 'css', 'design', 'frontend'], 'ch_1', 97400, '2026-03-06T14:00:00Z', 'published', undefined, 1847),
    v('v003', 'React Context vs Zustand vs Redux — Qual usar em 2025?', 'Comparação detalhada entre as três abordagens de gerenciamento de estado mais populares no ecossistema React. Casos de uso, trade-offs e performance.', ['react', 'javascript', 'frontend'], 'ch_1', 312800, '2026-03-05T09:00:00Z', 'published', undefined, 2154),
    v('v004', 'Formulários com React Hook Form e Zod', 'Validação de formulários com TypeScript estrito. Aprenda a combinar react-hook-form com zod para ter tipagem completa e UX polida.', ['react', 'typescript', 'frontend'], 'ch_1', 54100, '2026-03-04T16:00:00Z', 'published', undefined, 1523),
    v('v005', 'Server Components na Prática — Next.js 15', 'Entendendo o modelo mental dos React Server Components com exemplos reais de aplicações Next.js 15. Streaming, Suspense e cache.', ['react', 'frontend', 'javascript'], 'ch_1', 229600, '2026-03-03T11:00:00Z', 'published', undefined, 2489),
    v('v006', 'Animações Performáticas com Framer Motion', 'Técnicas avançadas de animação no React usando Framer Motion. Layout animations, gestures e spring physics.', ['react', 'animation', 'frontend', 'css'], 'ch_1', 73800, '2024-11-03T16:00:00Z', 'published', undefined, 1238),
    v('v007', 'TanStack Query — Gerenciamento de Estado Assíncrono', 'Guia completo do TanStack Query (ex-React Query): caching, background refetch, mutations e prefetch para SSR.', ['react', 'javascript', 'api', 'frontend'], 'ch_1', 145600, '2024-08-20T12:00:00Z', 'published', undefined, 1976),

    // --- DesignLab (ch_2) — Design & Figma ---
    v('v008', 'Design System com Figma — Do Token ao Componente', 'Criando um design system profissional no Figma com variables, auto layout e component properties. Workflow completo de designer para dev.', ['design', 'figma', 'css'], 'ch_2', 201300, '2025-10-01T10:00:00Z', 'published', undefined, 2662),
    v('v009', 'Auto Layout Avançado no Figma', 'Domine o auto layout do Figma: wrapping, absolute positioning, nested frames e boas práticas para handoff.', ['design', 'figma'], 'ch_2', 88700, '2025-08-14T15:00:00Z', 'published', undefined, 1344),
    v('v010', 'Prototipando Animações no Figma', 'Transitions, smart animate e overlays. Como criar protótipos de alta fidelidade que impressionam stakeholders.', ['design', 'figma', 'animation'], 'ch_2', 45200, '2025-06-30T11:00:00Z', 'published', undefined, 987),
    v('v011', 'UX Writing — Microcopy que Converte', 'Como palavras afetam a experiência do usuário. Técnicas de UX writing para botões, mensagens de erro e onboarding.', ['design'], 'ch_2', 62100, '2025-04-17T09:00:00Z', 'published', undefined, 1102),
    v('v012', 'Acessibilidade no Design — WCAG 2.2 na Prática', 'Guia prático de acessibilidade para designers: contraste, hierarquia visual, estados de foco e ARIA sem codigo.', ['design', 'frontend'], 'ch_2', 39800, '2025-02-05T14:00:00Z', 'published', undefined, 1815),
    v('v013', 'Dark Mode Design — Paletas e Variáveis', 'Estratégias de design para dark mode: semântica de cores, elevação de superfícies e consistência entre temas.', ['design', 'css', 'figma'], 'ch_2', 115400, '2024-12-20T10:00:00Z', 'published', undefined, 1432),
    v('v014', 'Responsive Design no Figma com Variables', 'Como usar variables e modes no Figma para criar layouts responsivos que escalam para mobile, tablet e desktop.', ['design', 'figma', 'css'], 'ch_2', 77600, '2024-10-08T13:00:00Z', 'published', undefined, 1267),

    // --- AlphaDevs (ch_3) — Algorithms & API ---
    v('v015', 'Estruturas de Dados em JavaScript — Guia Visual', 'Arrays, linked lists, stacks, queues, trees e graphs explicados visualmente com implementações em JavaScript moderno.', ['algorithms', 'javascript', 'frontend'], 'ch_3', 498200, '2025-09-22T09:00:00Z', 'published', undefined, 2543),
    v('v016', 'REST vs GraphQL vs tRPC — Qual API Escolher?', 'Comparação prática entre os três paradigmas de API mais usados hoje. Quando usar cada um, performance e developer experience.', ['api', 'backend', 'javascript'], 'ch_3', 267400, '2025-07-05T12:00:00Z', 'published', undefined, 1889),
    v('v017', 'Big O Notation — Complexidade de Algoritmos', 'Guia definitivo de análise de complexidade: O(1), O(n), O(log n), O(n²). Com exemplos reais e como identificar gargalos.', ['algorithms', 'javascript'], 'ch_3', 384100, '2025-04-28T10:00:00Z', 'published', undefined, 2211),
    v('v018', 'Autenticação JWT vs Sessions — Segurança na Prática', 'Desmistificando autenticação: como funcionam tokens JWT, sessions com cookies e quando escolher cada abordagem.', ['api', 'backend', 'javascript'], 'ch_3', 193500, '2025-02-13T14:00:00Z', 'published', undefined, 1654),
    v('v019', 'WebSockets e SSE — Comunicação em Tempo Real', 'Implementando features de tempo real com WebSockets e Server-Sent Events. Diferenças, casos de uso e escalabilidade.', ['api', 'javascript', 'backend'], 'ch_3', 142700, '2024-11-29T11:00:00Z', 'published', undefined, 1398),
    v('v020', 'Ordenação e Busca — Algoritmos Fundamentais', 'Merge sort, quicksort, binary search e BFS/DFS implementados em JavaScript com visualizações interativas.', ['algorithms', 'javascript'], 'ch_3', 219800, '2024-09-15T09:00:00Z', 'published', undefined, 1987),
    v('v021', 'OpenAPI e Documentação Automática de APIs', 'Gerando documentação Swagger automaticamente com OpenAPI 3.1. Integração com Node.js e boas práticas de especificação.', ['api', 'backend', 'nodejs'], 'ch_3', 86300, '2024-07-02T13:00:00Z', 'published', undefined, 1123),

    // --- MusicMakers (ch_4) — Music ---
    v('v022', 'Produção Musical no FL Studio — Do Zero ao Track', 'Tutorial completo de produção musical: bateria, baixo, melodia e mixagem. Criando uma faixa do zero no FL Studio.', ['music'], 'ch_4', 534700, '2025-10-05T16:00:00Z', 'published', undefined, 2700),
    v('v023', 'Mixagem para Iniciantes — Técnicas Essenciais', 'EQ, compressão e reverb explicados de forma simples. Como mixar suas primeiras faixas com qualidade profissional.', ['music'], 'ch_4', 312400, '2025-08-20T14:00:00Z', 'published', undefined, 1812),
    v('v024', 'Criando Beats de Hip-Hop com Amostras', 'Técnicas de sampling, chop e flip e criação de beats com samples. Teoria e prática no Ableton Live.', ['music'], 'ch_4', 278100, '2025-06-10T17:00:00Z', 'published', undefined, 2034),
    v('v025', 'Masterização — Deixando seu Áudio Profissional', 'Processo completo de masterização: limiter, steréo widening e loudness. Preparando para streaming e distribuição.', ['music'], 'ch_4', 189600, '2025-04-03T15:00:00Z', 'published', undefined, 1456),
    v('v026', 'Síntese Subtrativa — Entendendo Sintetizadores', 'Como funcionam os sintetizadores: osciladores, filtros, envelopes e LFOs. Criando sons do zero.', ['music'], 'ch_4', 145200, '2025-01-22T13:00:00Z', 'published', undefined, 1678),
    v('v027', 'Composição com MIDI — Teoria Musical na Prática', 'Teoria musical aplicada à produção: escalas, acordes, progressões e como usar MIDI para compor.', ['music'], 'ch_4', 201800, '2024-11-11T16:00:00Z', 'published', undefined, 2145),
    v('v028', 'Audio Design para Games e Filmes', 'Criando efeitos sonoros e trilha para games. Field recording, processamento e implementação com FMOD.', ['music', 'design'], 'ch_4', 98400, '2024-09-28T14:00:00Z', 'published', undefined, 1534),

    // --- TravelDiaries (ch_5) — Travel ---
    v('v029', 'Japão em 14 Dias — Itinerário Completo', 'Tokyo, Kyoto, Osaka e Hiroshima. Um roteiro detalhado com dicas de hospedagem, gastronomia e transporte no Japão.', ['travel'], 'ch_5', 892300, '2025-10-10T12:00:00Z', 'published', undefined, 2489),
    v('v030', 'Mochilão pela Europa com Menos de R$5.000', 'Estratégias para viajar pela Europa com baixo orçamento: Interrail, hostels, cozinha própria e atrações gratuitas.', ['travel'], 'ch_5', 1240600, '2025-08-05T10:00:00Z', 'published', undefined, 1923),
    v('v031', 'Patagônia — Trekking nas Torres del Paine', 'Guia completo para o W Trek e Circuit Trek. Equipamentos, clima, reservas e experiências únicas na Patagônia chilena.', ['travel'], 'ch_5', 387400, '2025-06-18T14:00:00Z', 'published', undefined, 2312),
    v('v032', 'Nômade Digital — Como Trabalhar Viajando', 'Dicas práticas para trabalhar remotamente enquanto viaja: conexão, rotina, vistos e destinos ideais para nômades digitais.', ['travel'], 'ch_5', 567800, '2025-03-30T11:00:00Z', 'published', undefined, 1765),
    v('v033', 'Marrocos — Medinas, Deserto e Hospitalidade', 'Fez, Marrakech, Chefchaouen e o Deserto do Saara. Cultura, culinária e dicas de segurança no Marrocos.', ['travel'], 'ch_5', 445200, '2024-12-15T15:00:00Z', 'published', undefined, 2078),
    v('v034', 'Southeast Asia em 30 Dias — Rota Definitiva', 'Tailândia, Vietnam, Cambodia e Indonesia em um mês. Logística, custo e highlights de cada destino.', ['travel'], 'ch_5', 723100, '2024-10-20T09:00:00Z', 'published', undefined, 2634),
    v('v035', 'Islandia — Aurora Boreal e Paisagens Únicas', 'Ring Road da Islândia: geleiras, vulcões, cascatas e a busca pela aurora boreal. Planejamento e clima.', ['travel'], 'ch_5', 634500, '2024-07-07T13:00:00Z', 'published', undefined, 1987),

    // --- GamersHub (ch_6) — Gaming ---
    v('v036', 'Review Elden Ring DLC — Shadow of the Erdtree', 'Análise completa da expansão de Elden Ring: dificuldade, lore, novos bosses e se vale o preço. Sem spoilers no início.', ['gaming'], 'ch_6', 2341500, '2025-09-28T18:00:00Z', 'published', undefined, 2456),
    v('v037', 'Top 10 Jogos Indie de 2025', 'Os melhores jogos independentes de 2025: Hollow Knight 2, Silksong e muito mais. Cada jogo com mini-review e nota.', ['gaming'], 'ch_6', 1456700, '2025-07-14T17:00:00Z', 'published', undefined, 1876),
    v('v038', 'Como Melhorar no Valorant — Guia para Iniciantes', 'Mecânicas, crosshair placement, economy e mental. Tudo que você precisa para subir de elo no Valorant.', ['gaming'], 'ch_6', 879200, '2025-05-22T16:00:00Z', 'published', undefined, 2189),
    v('v039', 'A História Completa de Dark Souls — Lore Explicado', 'Toda a lore de Dark Souls 1, 2 e 3 explicada em ordem cronológica. Personagens, reinos e o ciclo de fogo.', ['gaming'], 'ch_6', 1123800, '2025-03-08T19:00:00Z', 'published', undefined, 2698),
    v('v040', 'Baldur\'s Gate 3 — Melhores Builds do Patch 7', 'As classes e combinações mais poderosas de BG3 após o patch 7. Builds para todas as dificuldades.', ['gaming'], 'ch_6', 698400, '2024-12-01T17:00:00Z', 'published', undefined, 1543),
    v('v041', 'Retrogaming — Por Que os Jogos Antigos Ainda Importam', 'Análise de como jogos clássicos como Super Mario World, Chrono Trigger e Doom definiram a indústria moderna.', ['gaming'], 'ch_6', 412300, '2024-09-10T15:00:00Z', 'published', undefined, 2234),
    v('v042', 'Desenvolvimento de Games com Unity — Introdução', 'Primeiros passos no desenvolvimento de jogos com Unity: cenas, scripts, física e publicação mobile.', ['gaming', 'algorithms'], 'ch_6', 234600, '2024-06-25T14:00:00Z', 'published', undefined, 1812),

    // --- ScienceNow (ch_7) — Science ---
    v('v043', 'Física Quântica para Leigos — Guia Completo', 'Superposição, entrelaçamento e princípio da incerteza explicados de forma acessível. A estranheza do mundo quântico.', ['science'], 'ch_7', 1876400, '2025-10-12T11:00:00Z', 'published', undefined, 2587),
    v('v044', 'CRISPR — A Tesoura Molecular que Muda Tudo', 'Como a tecnologia CRISPR-Cas9 funciona e suas aplicações: cura de doenças genéticas, agricultura e implicações éticas.', ['science'], 'ch_7', 934200, '2025-08-28T10:00:00Z', 'published', undefined, 1934),
    v('v045', 'Buracos Negros — O Que Sabemos Hoje', 'Desde a singularidade até o horizonte de eventos. As descobertas recentes do Event Horizon Telescope e muito mais.', ['science'], 'ch_7', 2145800, '2025-06-14T13:00:00Z', 'published', undefined, 2345),
    v('v046', 'Neurociência da Criatividade — Como o Cérebro Cria', 'O que acontece no cérebro durante momentos de insight e criatividade. Neurofisiologia, flow state e aprendizado.', ['science'], 'ch_7', 678900, '2025-04-02T12:00:00Z', 'published', undefined, 1678),
    v('v047', 'Mudanças Climáticas — Ciência e Soluções', 'O estado atual da crise climática: dados, modelos e as tecnologias que podem fazer a diferença nas próximas décadas.', ['science'], 'ch_7', 1234500, '2025-01-19T14:00:00Z', 'published', undefined, 2156),
    v('v048', 'Fusão Nuclear — A Energia do Futuro Chegando', 'O progresso do ITER e das startups de fusão nuclear. Por que 2030 pode ser o ano em que isso muda tudo.', ['science'], 'ch_7', 891300, '2024-11-05T11:00:00Z', 'published', undefined, 1889),
    v('v049', 'Evolução — Darwin e o Estado Atual da Biologia', 'Revisitando a teoria da evolução com as descobertas modernas: epigenética, evolução sintética e seleção artificial.', ['science'], 'ch_7', 567800, '2024-08-22T10:00:00Z', 'published', undefined, 2432),

    // --- CookingByAna (ch_8) — Cooking ---
    v('v050', 'Ramen Caseiro — Do Zero em 6 Horas', 'Receita completa de ramen: caldo tonkotsu, tare de shoyu, toppings e o perfeito ovo marinado. Vale cada hora.', ['cooking'], 'ch_8', 2456300, '2025-10-08T17:00:00Z', 'published', undefined, 1456),
    v('v051', 'Fermentação em Casa — Kimchi, Kombucha e Sourdough', 'Introdução à fermentação caseira. Técnicas básicas, equipamentos e as melhores receitas para começar.', ['cooking'], 'ch_8', 1123700, '2025-08-01T15:00:00Z', 'published', undefined, 1987),
    v('v052', 'Técnicas Clássicas da Culinária Francesa', 'Brunoise, julienne, chiffonade, roux e as sauces mères. Domine as técnicas que são a base de toda a gastronomia.', ['cooking'], 'ch_8', 876500, '2025-05-25T14:00:00Z', 'published', undefined, 2345),
    v('v053', 'Temperos do Mundo — Como Usar Especiarias', 'Guia completo de especiarias: história, combinações, receitas e como construir uma despensa internacional.', ['cooking'], 'ch_8', 654200, '2025-03-12T16:00:00Z', 'published', undefined, 1723),
    v('v054', 'Confeitaria Francesa — Croissants Perfeitos', 'O processo completo de lamination para croissants: massa, manteiga, dobras e assamento. Com dicas de troubleshooting.', ['cooking'], 'ch_8', 1543800, '2024-12-28T13:00:00Z', 'published', undefined, 1234),
    v('v055', 'Cozinha Vegana Proteica — Sem Sacrificar Sabor', 'Fontes de proteína vegetal, substitutos e as melhores receitas veganas com alto valor proteico e sabor incrível.', ['cooking'], 'ch_8', 432100, '2024-10-14T15:00:00Z', 'published', undefined, 1567),
    v('v056', 'Grelhados e Defumação — BBQ no Próximo Nível', 'Técnicas de defumação, cortes para churrasco, temperaturas e o segredo para carnes perfeitas no fumeiro.', ['cooking'], 'ch_8', 1089400, '2024-07-20T17:00:00Z', 'published', undefined, 2089),

    // --- MLFoundry (ch_9) — Machine Learning ---
    v('v057', 'Redes Neurais do Zero em Python', 'Implementando uma rede neural sem frameworks. Backpropagation, gradiente descendente e o intuição matemática.', ['machine-learning', 'python', 'algorithms'], 'ch_9', 543200, '2025-09-18T10:00:00Z', 'published', undefined, 2678),
    v('v058', 'Transformers e Atenção — Como o GPT Funciona', 'A arquitetura Transformer explicada: self-attention, multi-head attention, positional encoding. A base dos LLMs modernos.', ['machine-learning', 'python', 'algorithms'], 'ch_9', 987600, '2025-07-10T11:00:00Z', 'published', undefined, 2489),
    v('v059', 'Computer Vision com PyTorch — Detecção de Objetos', 'Implementando YOLO e ResNet com PyTorch. Transfer learning, fine-tuning e deploy de modelos de visão computacional.', ['machine-learning', 'python'], 'ch_9', 345800, '2025-05-04T13:00:00Z', 'published', undefined, 1976),
    v('v060', 'Reinforcement Learning — Jogando Games com IA', 'Q-learning e Deep Q-Networks para treinar agentes que aprendem a jogar jogos. Gym, Atari e a teoria por trás.', ['machine-learning', 'python', 'algorithms', 'gaming'], 'ch_9', 289700, '2025-02-28T12:00:00Z', 'published', undefined, 2312),
    v('v061', 'NLP — Processamento de Linguagem Natural na Prática', 'Tokenization, embeddings, BERT e fine-tuning para classificação de texto, NER e geração de texto.', ['machine-learning', 'python', 'api'], 'ch_9', 412300, '2024-12-10T10:00:00Z', 'published', undefined, 1845),
    v('v062', 'Dados e Feature Engineering — O que Ninguém Ensina', 'Limpeza, normalização, encoding e criação de features. A parte mais importante e menos glamourosa do ML.', ['machine-learning', 'python', 'algorithms'], 'ch_9', 234100, '2024-10-01T11:00:00Z', 'published', undefined, 2123),
    v('v063', 'MLOps — Deploy e Monitoramento de Modelos', 'Ciclo completo de MLOps: versionamento de dados, CI/CD para ML, monitoramento de drift e rollback de modelos.', ['machine-learning', 'python', 'devops', 'docker'], 'ch_9', 178900, '2024-07-15T13:00:00Z', 'published', undefined, 1654),

    // --- DockerOps (ch_10) — Docker & DevOps ---
    v('v064', 'Docker do Zero — Containers na Prática', 'Guia completo de Docker: images, containers, volumes, networks e docker-compose. Com exemplos reais de aplicações.', ['docker', 'devops'], 'ch_10', 876400, '2025-09-05T09:00:00Z', 'published', undefined, 2187),
    v('v065', 'Kubernetes em 1 Hora — Fundamentos Essenciais', 'Pods, services, deployments, configmaps e ingress. Tudo que você precisa para entender Kubernetes e passar no CKAD.', ['docker', 'devops'], 'ch_10', 654300, '2025-07-20T10:00:00Z', 'published', undefined, 3542),
    v('v066', 'CI/CD com GitHub Actions — Pipeline Completo', 'Construindo pipelines de CI/CD do zero: testes, lint, build, deploy e notificações com GitHub Actions.', ['devops', 'git'], 'ch_10', 432100, '2025-05-15T11:00:00Z', 'published', undefined, 1934),
    v('v067', 'Git Avançado — Rebase, Bisect e Workflows', 'Dominando git: rebase interativo, cherry-pick, bisect, submodules e os principais workflows para times de desenvolvimento.', ['git', 'devops'], 'ch_10', 567800, '2025-03-25T09:00:00Z', 'published', undefined, 2456),
    v('v068', 'Observabilidade — Logs, Métricas e Traces', 'Implementando a pilha ELK, Prometheus/Grafana e Jaeger. Como ter visibilidade total de sistemas em produção.', ['devops', 'backend', 'docker'], 'ch_10', 289400, '2024-12-05T10:00:00Z', 'published', undefined, 2098),
    v('v069', 'Terraform — Infraestrutura como Código na AWS', 'Provisionando recursos na AWS com Terraform: EC2, RDS, VPC, IAM e módulos reutilizáveis. Boas práticas de IaC.', ['devops', 'docker', 'backend'], 'ch_10', 345600, '2024-09-18T11:00:00Z', 'published', undefined, 1765),
    v('v070', 'Security DevOps — SAST, DAST e Supply Chain', 'Integrando segurança no pipeline de CI/CD: SAST com Semgrep, DAST com ZAP e verificação de dependências com Snyk.', ['devops', 'backend', 'api'], 'ch_10', 198700, '2024-06-30T09:00:00Z', 'published', undefined, 1543),

    // --- TypescriptPro (ch_11) — TypeScript ---
    v('v071', 'TypeScript Avançado — Types Condicionais e Infer', 'Mapped types, conditional types, infer, template literal types e utility types customizados. O TypeScript que poucos dominam.', ['typescript', 'javascript', 'frontend'], 'ch_11', 312400, '2025-09-10T10:00:00Z', 'published', undefined, 2234),
    v('v072', 'Decorators e Metadata em TypeScript 5', 'A nova proposta de decorators no TypeScript 5. Casos de uso, injeção de dependência e frameworks que os utilizam.', ['typescript', 'javascript', 'backend'], 'ch_11', 189600, '2025-07-28T11:00:00Z', 'published', undefined, 1678),
    v('v073', 'TypeScript para Backends — Express, Fastify e Node', 'Tipando APIs Node.js do zero: controllers, middlewares, validação com Zod e geração automática de tipos para clientes.', ['typescript', 'javascript', 'backend', 'nodejs', 'api'], 'ch_11', 254300, '2025-05-20T12:00:00Z', 'published', undefined, 2012),
    v('v074', 'Generics na Prática — TypeScript que Escala', 'Dominando generics no TypeScript: constraints, defaults, variância e padrões avançados para bibliotecas reutilizáveis.', ['typescript', 'javascript'], 'ch_11', 198200, '2025-03-05T10:00:00Z', 'published', undefined, 1456),
    v('v075', 'Migrando de JavaScript para TypeScript — Sem Dor', 'Estratégia incremental de migração: jsconfig, allowJs, declarações e como converter arquivos um a um mantendo o projeto funcional.', ['typescript', 'javascript', 'frontend'], 'ch_11', 345100, '2024-11-18T11:00:00Z', 'published', undefined, 1876),
    v('v076', 'TypeScript e Monorepos com Turborepo', 'Configurando um monorepo com Turborepo, compartilhando tipos entre pacotes e otimizando o processo de build.', ['typescript', 'javascript', 'devops', 'frontend'], 'ch_11', 167800, '2024-09-02T10:00:00Z', 'published', undefined, 1312),

    // --- FrontendFocus (ch_12) — Frontend ---
    v('v077', 'CSS Grid — O Guia Definitivo', 'Tudo sobre CSS Grid: named lines, areas, subgrid, auto-fill vs auto-fit e layouts complexos que antes eram impossíveis.', ['css', 'frontend'], 'ch_12', 423600, '2025-10-03T09:00:00Z', 'published', undefined, 2678),
    v('v078', 'Performance Web — Core Web Vitals na Prática', 'LCP, INP e CLS: o que são, como medir e como otimizar cada métrica. Ferramentas e técnicas reais.', ['frontend', 'performance', 'javascript'], 'ch_12', 287400, '2025-08-10T10:00:00Z', 'published', undefined, 1923),
    v('v079', 'Web Components — O Padrão que Nunca Morreu', 'Custom Elements, Shadow DOM e HTML Templates. Como criar componentes reutilizáveis sem frameworks.', ['frontend', 'javascript', 'css'], 'ch_12', 156800, '2025-06-22T11:00:00Z', 'published', undefined, 1456),
    v('v080', 'Acessibilidade Web — ARIA e HTML Semântico', 'Implementando acessibilidade real: roles ARIA, live regions, navegação por teclado e testes com leitores de tela.', ['frontend', 'design'], 'ch_12', 198400, '2025-04-15T09:00:00Z', 'published', undefined, 2089),
    v('v081', 'Micro-frontends — Arquitetura para Times Grandes', 'Module Federation, Single SPA e estratégias de composição de micro-frontends para grandes times e organizações.', ['frontend', 'javascript', 'react'], 'ch_12', 134700, '2025-01-30T10:00:00Z', 'published', undefined, 2345),
    v('v082', 'PWA em 2025 — Progressive Web Apps Modernas', 'Service Workers, Web Push, background sync e instalação. Construindo PWAs que competem com apps nativos.', ['frontend', 'javascript'], 'ch_12', 245300, '2024-11-22T11:00:00Z', 'published', undefined, 1765),

    // --- BackendBeats (ch_13) — Backend & Node ---
    v('v083', 'Node.js Streams — Processando Grandes Volumes de Dados', 'Transform streams, pipe chains e backpressure. Como processar arquivos gigantes em Node.js sem travar o servidor.', ['nodejs', 'backend', 'javascript', 'performance'], 'ch_13', 178900, '2025-09-25T10:00:00Z', 'published', undefined, 1654),
    v('v084', 'Arquitetura Hexagonal com Node.js', 'Ports & Adapters na prática: separando domain, application e infrastructure. Com exemplos reais de uma API de e-commerce.', ['nodejs', 'backend', 'api', 'algorithms'], 'ch_13', 234500, '2025-07-18T11:00:00Z', 'published', undefined, 2198),
    v('v085', 'PostgreSQL Avançado — Queries e Otimização', 'CTEs, window functions, explain analyze, índices parciais e partitioning. O que todo dev backend precisa saber de Postgres.', ['backend', 'database', 'api'], 'ch_13', 312700, '2025-05-08T09:00:00Z', 'published', undefined, 2456),
    v('v086', 'Redis — Cache, Pub/Sub e Rate Limiting', 'Padrões de uso do Redis: cache estratégico, filas com BullMQ, pub/sub e proteção contra DDoS com rate limiting.', ['backend', 'nodejs', 'database', 'performance'], 'ch_13', 267400, '2025-02-22T10:00:00Z', 'published', undefined, 1876),
    v('v087', 'CQRS e Event Sourcing — Quando Usar?', 'Os padrões CQRS e Event Sourcing desmistificados: benefícios, complexidade e casos onde realmente fazem sentido.', ['backend', 'api', 'algorithms'], 'ch_13', 189300, '2024-12-08T11:00:00Z', 'published', undefined, 2134),
    v('v088', 'GraphQL com Apollo Server — API Completa', 'Construindo uma API GraphQL completa: schemas, resolvers, dataloaders e autenticação. Comparação com REST.', ['backend', 'api', 'nodejs'], 'ch_13', 234100, '2024-09-25T09:00:00Z', 'published', undefined, 1987),

    // --- CSSArtisan (ch_14) — CSS & Animation ---
    v('v089', 'CSS Animations — Da Teoria à Arte', 'Keyframes, easing functions, motion design principles e como criar animações que guiam o usuário sem distrair.', ['css', 'animation', 'frontend', 'design'], 'ch_14', 345800, '2025-10-06T11:00:00Z', 'published', undefined, 1543),
    v('v090', 'CSS Architecture — BEM, SMACSS e CSS Modules', 'Comparando metodologias de CSS: BEM, SMACSS, CSS-in-JS e CSS Modules. Qual escolher para cada tamanho de projeto.', ['css', 'frontend'], 'ch_14', 198200, '2025-08-18T09:00:00Z', 'published', undefined, 1234),
    v('v091', 'Custom Properties CSS — Além das Variáveis', 'Propriedades customizadas para theming, componentes dinâmicos e patterns avançados que mudam como você escreve CSS.', ['css', 'frontend', 'design'], 'ch_14', 267400, '2025-06-05T10:00:00Z', 'published', undefined, 1876),
    v('v092', 'Scroll-driven Animations — CSS Puro Sem JS', 'A nova API de scroll-driven animations: animation-timeline, scroll() e view(). Parallax e reveals puramente em CSS.', ['css', 'animation', 'frontend'], 'ch_14', 312100, '2025-03-22T11:00:00Z', 'published', undefined, 1456),
    v('v093', 'CSS Houdini — A API que Transforma o CSS', 'Paint Worklet, Layout API e Typed OM. Como o CSS Houdini permite criar efeitos visuais customizados de baixo nível.', ['css', 'frontend', 'javascript'], 'ch_14', 145600, '2024-12-18T10:00:00Z', 'published', undefined, 1189),
    v('v094', '3D no Browser — CSS Transforms e WebGL Básico', 'Criando perspectiva, rotações 3D e cenas básicas em CSS e Three.js. Do simples ao imersivo.', ['css', 'animation', 'javascript', 'frontend'], 'ch_14', 234800, '2024-10-04T11:00:00Z', 'published', undefined, 1723),

    // --- PythonLabs (ch_15) — Python ---
    v('v095', 'Python Assíncrono — asyncio do Zero ao Avançado', 'Event loop, coroutines, tasks e os padrões mais importantes do asyncio. Com exemplos de APIs e web scraping assíncrono.', ['python', 'backend', 'performance'], 'ch_15', 287600, '2025-09-30T10:00:00Z', 'published', undefined, 2312),
    v('v096', 'FastAPI — A API do Futuro com Python', 'Construindo APIs ultra-rápidas com FastAPI: dependency injection, validação com Pydantic, autenticação e docs automáticos.', ['python', 'backend', 'api'], 'ch_15', 456300, '2025-07-15T11:00:00Z', 'published', undefined, 1876),
    v('v097', 'Pandas e Polars — Análise de Dados Moderna', 'Comparação entre Pandas e o novo Polars. Performance, syntax e quando migrar para a alternativa mais rápida.', ['python', 'algorithms', 'machine-learning'], 'ch_15', 234700, '2025-05-28T09:00:00Z', 'published', undefined, 1654),
    v('v098', 'Python para Scripts de Automação', 'Automatizando tarefas repetitivas: web scraping com Playwright, manipulação de arquivos e integração com APIs.', ['python', 'algorithms', 'api'], 'ch_15', 389100, '2025-03-10T10:00:00Z', 'published', undefined, 1234),
    v('v099', 'Concorrência em Python — Threads, Processos e Async', 'Threading, multiprocessing e asyncio: quando usar cada um, o GIL e como extrair o máximo de performance do Python.', ['python', 'backend', 'performance', 'algorithms'], 'ch_15', 198500, '2024-12-22T11:00:00Z', 'published', undefined, 1987),
    v('v100', 'Clean Code em Python — Além do PEP 8', 'Boas práticas além do PEP 8: SOLID em Python, design patterns, typing avançado e como escrever código que escala.', ['python', 'backend', 'algorithms'], 'ch_15', 312400, '2024-10-08T10:00:00Z', 'published', undefined, 2134),

    // --- Vídeos extras para completar variedade ---
    v('v101', 'Svelte 5 — O Framework que Repensa Reatividade', 'Runes, $state e $derived. Como o Svelte 5 transforma a reatividade e por que está ganhando popularidade rapidamente.', ['javascript', 'frontend', 'css'], 'ch_12', 189700, '2025-10-15T10:00:00Z', 'published', undefined, 1456),
    v('v102', 'Go para Desenvolvedores JavaScript', 'Transição de JS para Go: sintaxe, goroutines, canais e como criar APIs extremamente performáticas com Go.', ['backend', 'api', 'algorithms'], 'ch_13', 267300, '2025-08-25T11:00:00Z', 'published', undefined, 2189),
    v('v103', 'CSS Moderno em 2025 — Features Que Você Precisa Conhecer', 'Container queries, :has(), layer, nesting nativo e color-mix(). O CSS de hoje que parece ficção científica.', ['css', 'frontend'], 'ch_14', 423100, '2025-06-12T09:00:00Z', 'published', undefined, 1654),
    v('v104', 'Algoritmos de Grafos — BFS, DFS e Dijkstra', 'Implementando algoritmos fundamentais de grafos em JavaScript com casos de uso reais: mapas, redes sociais e roteamento.', ['algorithms', 'javascript'], 'ch_3', 312800, '2025-04-20T10:00:00Z', 'published', undefined, 2378),
    v('v105', 'Receitas com Miso — Umami na Cozinha Ocidental', 'Como usar pasta de miso além da sopa: marinadas, molhos, assados e sobremesas. O ingrediente secreto dos chefs.', ['cooking'], 'ch_8', 743200, '2025-02-10T15:00:00Z', 'published', undefined, 987),
    v('v106', 'Padrões de Design de APIs RESTful', 'Versionamento, paginação, filtering, HATEOAS e os princípios que transformam uma API boa em uma API excelente.', ['api', 'backend', 'nodejs'], 'ch_13', 198400, '2024-11-15T10:00:00Z', 'published', undefined, 1876),
    v('v107', 'Percorrendo o Deserto do Atacama', 'O lugar mais seco da Terra: roteiro, fotografia, astronomia no céu mais limpo do mundo e dicas de sobrevivência.', ['travel'], 'ch_5', 498700, '2024-08-30T14:00:00Z', 'published', undefined, 2456),
    v('v108', 'Física do Som — Como a Música Funciona', 'Frequências, harmônicos, timbre e psicoacústica. A ciência por trás de por que algumas músicas soam tão bem.', ['music', 'science'], 'ch_4', 356200, '2024-06-10T13:00:00Z', 'published', undefined, 1765),
    v('v109', 'Monorepo com Python e Poetry', 'Gerenciando múltiplos projetos Python em um monorepo com Poetry, workspaces e compartilhamento de dependências.', ['python', 'devops', 'backend'], 'ch_15', 145800, '2024-04-25T11:00:00Z', 'published', undefined, 1312),
    v('v110', 'Introdução à Física dos Buracos Negros', 'Relatividade geral, singularidades e o paradoxo da informação. Hawking radiation e o que acontece além do horizonte.', ['science'], 'ch_7', 1567400, '2024-02-14T12:00:00Z', 'published', undefined, 2698),

    // --- Shorts (#shorts) ---
    v('s001', 'CSS Grid em 60 Segundos', 'Tudo que você precisa saber sobre CSS Grid em menos de um minuto.', ['shorts', 'css', 'frontend'], 'ch_14', 1_820_400, '2026-03-10T10:00:00Z', 'published', undefined, 62),
    v('s002', 'O que é um Closure em JavaScript?', 'Closures explicados de forma simples e visual. Vai mudar como você pensa em funções.', ['shorts', 'javascript', 'frontend'], 'ch_3', 2_341_700, '2026-03-09T14:00:00Z', 'published', undefined, 54),
    v('s003', 'Docker em 45 Segundos', 'Container, imagem, volume e network — o essencial do Docker no menor tempo possível.', ['shorts', 'docker', 'devops'], 'ch_10', 987_300, '2026-03-08T09:00:00Z', 'published', undefined, 47),
    v('s004', 'Segredo de Risoto Perfeito', 'A técnica que chefs escondem para deixar o risoto cremoso. Simples e infalível.', ['shorts', 'cooking'], 'ch_8', 3_102_500, '2026-03-07T18:00:00Z', 'published', undefined, 58),
    v('s005', 'Git Rebase vs Merge — Diferença Real', 'Entenda de vez a diferença entre rebase e merge com uma analogia visual rápida.', ['shorts', 'git'], 'ch_1', 1_456_200, '2026-03-06T11:00:00Z', 'published', undefined, 51),
    v('s006', 'Por que o Céu é Azul? (Física Rápida)', 'Espalhamento de Rayleigh explicado em 30 segundos. Física bonita, simples assim.', ['shorts', 'science'], 'ch_7', 4_280_900, '2026-03-05T16:00:00Z', 'published', undefined, 34),

    // --- Vídeos agendados (~10) ---
    v('v111', 'React 20 — O Que Esperar', 'Preview das features planejadas para o React 20: compilador estável, novos hooks e melhorias de concorrência.', ['react', 'frontend', 'javascript'], 'ch_1', 0, '2026-03-03T12:00:00Z', 'scheduled', '2026-03-20T18:00:00Z'),
    v('v112', 'AI-Assisted Design — Figma AI na Prática', 'Como usar as novas ferramentas de IA do Figma para acelerar o workflow de design sem perder qualidade.', ['design', 'figma'], 'ch_2', 0, '2026-03-03T12:00:00Z', 'scheduled', '2026-03-22T14:00:00Z'),
    v('v113', 'Rust para Desenvolvedores Python', 'Migrando código crítico de Python para Rust: memory safety, performance e bindings com PyO3.', ['python', 'backend', 'performance', 'algorithms'], 'ch_15', 0, '2026-03-03T12:00:00Z', 'scheduled', '2026-03-25T10:00:00Z'),
    v('v114', 'Kubernetes 1.30 — Novidades e Breaking Changes', 'Revisão completa das mudanças do Kubernetes 1.30: deprecations, novos recursos e guia de migração.', ['docker', 'devops'], 'ch_10', 0, '2026-03-03T12:00:00Z', 'scheduled', '2026-03-28T09:00:00Z'),
    v('v115', 'GPT-5 e o Novo Paradigma dos LLMs', 'Análise técnica das capacidades do GPT-5, benchmarks e implicações para a área de machine learning.', ['machine-learning', 'python', 'api'], 'ch_9', 0, '2026-03-03T12:00:00Z', 'scheduled', '2026-04-01T11:00:00Z'),
    v('v116', 'TypeScript 6 — O Que Mudou?', 'Todas as novidades do TypeScript 6: isolatedDeclarations, novos utility types e melhorias de performance do compiler.', ['typescript', 'javascript'], 'ch_11', 0, '2026-03-03T12:00:00Z', 'scheduled', '2026-04-05T10:00:00Z'),
    v('v117', 'Cozinha Molecular — Técnicas de Alta Gastronomia', 'Esferificação, gelificação e outras técnicas da cozinha molecular para uso doméstico. Ciência no prato.', ['cooking', 'science'], 'ch_8', 0, '2026-03-03T12:00:00Z', 'scheduled', '2026-04-08T15:00:00Z'),
    v('v118', 'Volta ao Mundo em 365 Dias — Planejamento', 'Como planejar uma volta ao mundo: logística, orçamento, vistos e o que aprendi tentando fazer isso na prática.', ['travel'], 'ch_5', 0, '2026-03-03T12:00:00Z', 'scheduled', '2026-04-12T12:00:00Z'),
    v('v119', 'WebAssembly em 2026 — Estado da Arte', 'WASM threads, SIMD, garbage collection e component model. O que WebAssembly pode fazer hoje que era impossível antes.', ['frontend', 'javascript', 'performance'], 'ch_12', 0, '2026-03-03T12:00:00Z', 'scheduled', '2026-04-15T10:00:00Z'),
    v('v120', 'CSS Quantum — O Próximo Passo do CSS', 'Especulação fundamentada sobre para onde o CSS está indo: native CSS mixins, typed custom properties e logical properties.', ['css', 'frontend', 'animation'], 'ch_14', 0, '2026-03-03T12:00:00Z', 'scheduled', '2026-04-20T11:00:00Z'),
];

export const MOCK_VIDEOS: Video[] = RAW_VIDEOS.map((video, index) => ({
    ...video,
    videoUrl: SAMPLE_VIDEO_LIST[index % SAMPLE_VIDEO_LIST.length],
}));
