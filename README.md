# Mapa Lago Corumbá IV

Aplicação web gratuita, responsiva e sem backend para explorar e demarcar pontos, linhas e áreas no **Lago Corumbá IV, Goiás**.

## Recursos

- Mapa OpenStreetMap ou imagem de satélite Esri, com os créditos de origem.
- GPS pelo navegador, mediante permissão. Atualização da posição e círculo de precisão em tempo real.
- Ferramentas para inserir, editar e apagar **pontos, linhas e polígonos** via Leaflet Draw.
- Medidas aproximadas de distância (metros e quilômetros) e área (m² e hectares).
- Nomes livres para marcações; listagem navegável; salvamento automático no **localStorage** do navegador.
- Exportação/importação GeoJSON com validações de tipo, quantidade e coordenadas.
- Definição de um **ponto de chegada escolhido pelo usuário**. Abre a navegação de carro no Google Maps com GPS, se autorizado. Não cria uma rota automática para o meio do reservatório.
- Interface em português com foco mobile.

## Como executar

### Testar

```bash
npm test
npm run check
```

### Executar localmente

Na pasta do projeto:

```bash
python -m http.server 4173
```

Depois abra `http://localhost:4173` no navegador. Servidor local ou HTTPS é necessário para o navegador disponibilizar o GPS. O mapa requer internet para carregar os blocos cartográficos e as bibliotecas Leaflet.

### Publicar no GitHub Pages

1. Crie um repositório chamado `mapa-lago-corumba-iv` no GitHub.
2. Envie todos os arquivos da pasta para o ramo `main`.
3. Em **Settings → Pages**, selecione **Deploy from a branch → main / (root)**.
4. A URL será `https://SEU-USUARIO.github.io/mapa-lago-corumba-iv/` depois da implantação.

O projeto não precisa de processo de compilação nem de chaves de API.

## Como usar

1. **Ativar meu GPS:** permita acesso à localização. O navegador só a utiliza enquanto o mapa estiver aberto com GPS ligado.
2. **Demarcar:** use os botões de desenho no canto superior esquerdo do mapa. Após desenhar, dê um nome. Use as ferramentas de edição/remoção na mesma barra.
3. **Rota:** clique em “Escolher chegada” e toque em uma entrada terrestre conhecida. Arraste para refinar o destino e clique em “Abrir rota”. Evite definir pontos na água ou dentro de propriedades privadas.
4. **Backup:** exporte suas marcações como GeoJSON. A importação substitui as marcações atuais somente após confirmação.

## Privacidade e limites

- A localização GPS **não é salva** em arquivo nem no localStorage pelo aplicativo. A permissão é gerenciada pelo navegador; ao desativar, os indicadores de localização são retirados do mapa.
- Os pontos, linhas e polígonos criados são salvos **apenas no dispositivo**, exceto se você exportar/compartilhar um arquivo.
- Mapas e imagens de satélite carregam de provedores externos e podem registrar conexões/IP conforme suas próprias políticas.
- O centro inicial **(-16.10050, -48.28942)** é uma **referência do lago**, conforme dados do OpenStreetMap/Mapcarta, **não um acesso rodoviário, píer nem limite oficial**.
- As medidas são aproximações geométricas para planejamento visual e **não substituem levantamento topográfico, regularização fundiária ou consulta ambiental**.
- Antes de ir ao lago, confirme acesso, portões, propriedade particular e segurança. O lago possui APP sujeita à legislação ambiental.

## Referências cartográficas

- Governo de Goiás: [guia turístico oficial do Lago Corumbá IV](https://goias.gov.br/entorno/wp-content/uploads/sites/30/2023/07/GUIA_LAGOC4_2024.pdf).
- [Mapa da região no OpenStreetMap (via Mapcarta)](https://mapcarta.com/pt/W317075020).
- [Lago Corumbá IV no Goiás Turismo](https://goiasturismo.go.gov.br/pt/atracoes/alexania/lago-corumba-iv).
- [Licença/atribuição OpenStreetMap](https://www.openstreetmap.org/copyright).

## Stack

HTML5, CSS3, JavaScript ES Modules, Leaflet 1.9.4, Leaflet Draw 1.0.4 e testes com `node:test` (Node.js 22).
