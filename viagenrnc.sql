-- ============================================================
-- BANCO DE DADOS - ViagenRNC (MySQL 8.0.16 ou mais novo)
-- ============================================================
-- Este arquivo cria o banco inteiro do site de voos ViagenRNC:
-- tabelas, regras, dados iniciais, gatilhos, procedimentos e views.
--
-- Hoje o site guarda tudo no localStorage do navegador. Aqui cada
-- chave do localStorage virou uma tabela:
--   vrnc_voos2   -> voos (+ cidades, estados e companhias)
--   vrnc_vip     -> usuarios.vip_ativo
--   vrnc_desc2   -> descontos_vip
--   vrnc_hist2   -> reservas
--   vrnc_tarefas2-> tarefas
--   vrnc_ia2     -> mensagens_chat
--   vrnc_theme   -> usuarios.tema
--
-- Este script SÓ cria o banco. Não existe ligação com o site:
-- para o JavaScript gravar aqui seria preciso um servidor (backend).
--
-- Como usar: abra no MySQL Workbench (ou phpMyAdmin) e execute tudo.
-- Cuidado: a linha DROP DATABASE apaga o banco viagenrnc se ele já existir.
-- ============================================================

-- Garante que acentos e emojis sejam lidos corretamente
SET NAMES utf8mb4;


-- ============================================================
-- PARTE 1 - CRIAR O BANCO
-- ============================================================

-- Apaga o banco antigo (se existir) para começar do zero
DROP DATABASE IF EXISTS viagenrnc;

-- Cria o banco usando utf8mb4 (aceita acentos e emojis)
CREATE DATABASE viagenrnc
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

-- Diz ao MySQL que os próximos comandos são para este banco
USE viagenrnc;


-- ============================================================
-- PARTE 2 - TABELAS DO CATÁLOGO DE VOOS
-- (no site: constantes CIDADES e CIAS e a função gerarVoos)
-- ============================================================

-- ESTADOS: os 3 estados atendidos (SP, RJ e MG)
CREATE TABLE estados (
    sigla CHAR(2) PRIMARY KEY,              -- SP, RJ ou MG (é a chave da tabela)
    nome  VARCHAR(40) NOT NULL UNIQUE       -- nome por extenso, sem repetir
);

-- CIDADES: as 15 cidades de destino
CREATE TABLE cidades (
    id_cidade    INT AUTO_INCREMENT PRIMARY KEY,   -- número único da cidade
    nome         VARCHAR(60) NOT NULL UNIQUE,      -- ex.: Campinas
    sigla_estado CHAR(2) NOT NULL,                 -- estado da cidade
    slug_imagem  VARCHAR(60) NOT NULL,             -- nome do arquivo da foto (assets/images/<slug>.jpg)
    -- Só aceita um estado que exista na tabela estados
    CONSTRAINT fk_cidades_estado
        FOREIGN KEY (sigla_estado) REFERENCES estados (sigla)
);

-- COMPANHIAS: as 5 companhias aéreas inventadas
CREATE TABLE companhias (
    id_companhia INT AUTO_INCREMENT PRIMARY KEY,   -- número único da companhia
    nome         VARCHAR(60) NOT NULL UNIQUE       -- ex.: Nuvem Air
);

-- VOOS: os 75 voos do catálogo (5 por cidade)
CREATE TABLE voos (
    id_voo         INT AUTO_INCREMENT PRIMARY KEY,  -- no site o id é 'f' + este número (f1, f2...)
    id_cidade      INT NOT NULL,                    -- cidade de destino
    id_companhia   INT NOT NULL,                    -- companhia que faz o voo
    numero_voo     VARCHAR(10) NOT NULL UNIQUE,     -- código do voo, ex.: VR1000
    saida          TIME NOT NULL,                   -- horário de partida
    chegada        TIME NOT NULL,                   -- horário de chegada
    duracao_min    SMALLINT UNSIGNED NOT NULL,      -- duração em minutos (o texto 2h05 é calculado na view)
    preco          DECIMAL(10,2) NOT NULL,          -- preço por passageiro, sem desconto
    assentos_total SMALLINT UNSIGNED NOT NULL,      -- assentos que o voo tinha no início
    assentos       SMALLINT UNSIGNED NOT NULL,      -- assentos livres agora (diminui na compra, volta no cancelamento)
    CONSTRAINT fk_voos_cidade    FOREIGN KEY (id_cidade)    REFERENCES cidades (id_cidade),
    CONSTRAINT fk_voos_companhia FOREIGN KEY (id_companhia) REFERENCES companhias (id_companhia),
    -- Regras: preço positivo, duração positiva e nunca mais assentos livres do que o total
    CONSTRAINT chk_voos_preco    CHECK (preco > 0),
    CONSTRAINT chk_voos_duracao  CHECK (duracao_min > 0),
    CONSTRAINT chk_voos_assentos CHECK (assentos <= assentos_total),
    -- Índices deixam as buscas dos filtros mais rápidas
    INDEX idx_voos_cidade (id_cidade),
    INDEX idx_voos_preco (preco)
);


-- ============================================================
-- PARTE 3 - USUÁRIOS, VIP E DESCONTOS
-- (no site: vrnc_theme, vrnc_vip e vrnc_desc2)
-- ============================================================

-- USUARIOS: quem usa o site. O site de hoje não tem login (cada navegador
-- é uma pessoa), então esta tabela representa essa pessoa.
CREATE TABLE usuarios (
    id_usuario     INT AUTO_INCREMENT PRIMARY KEY,
    nome           VARCHAR(100) NOT NULL,
    email          VARCHAR(150) NOT NULL UNIQUE,                  -- não deixa cadastrar o mesmo e-mail duas vezes
    tema           ENUM('light', 'dark') NOT NULL DEFAULT 'light', -- tema escolhido (o padrão do site é o claro)
    vip_ativo      BOOLEAN NOT NULL DEFAULT FALSE,                -- TRUE quando ativou a Área VIP
    vip_ativado_em DATETIME NULL,                                 -- quando o VIP foi ativado
    criado_em      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP    -- data do cadastro (preenchida sozinha)
);

-- DESCONTOS_VIP: o desconto sorteado de cada voo para cada usuário.
-- É sorteado uma vez só, na primeira ativação, e continua salvo depois.
CREATE TABLE descontos_vip (
    id_usuario INT NOT NULL,
    id_voo     INT NOT NULL,
    percentual TINYINT UNSIGNED NOT NULL,           -- 10, 15, 20 ou 25 (por cento)
    PRIMARY KEY (id_usuario, id_voo),               -- um usuário só tem um desconto por voo
    -- Se o usuário ou o voo for apagado, o desconto some junto
    CONSTRAINT fk_desc_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario) ON DELETE CASCADE,
    CONSTRAINT fk_desc_voo     FOREIGN KEY (id_voo)     REFERENCES voos (id_voo) ON DELETE CASCADE,
    -- Só aceita as porcentagens que o site sorteia
    CONSTRAINT chk_desc_percentual CHECK (percentual IN (10, 15, 20, 25))
);


-- ============================================================
-- PARTE 4 - RESERVAS (compra simulada)
-- (no site: vrnc_hist2 e a função comprarPassagem)
-- ============================================================

CREATE TABLE reservas (
    id_reserva      INT AUTO_INCREMENT PRIMARY KEY,
    codigo          VARCHAR(11) NOT NULL UNIQUE,     -- código da reserva, ex.: VRNC-A1B2C3
    id_usuario      INT NOT NULL,                    -- quem comprou
    id_voo          INT NOT NULL,                    -- voo comprado
    nome_comprador  VARCHAR(100) NOT NULL,           -- campo "Nome do comprador" do formulário
    email_comprador VARCHAR(150) NOT NULL,           -- campo "E-mail" (o site pede, mas não guarda)
    data_viagem     DATE NOT NULL,                   -- data escolhida para viajar
    qtd_passageiros SMALLINT UNSIGNED NOT NULL,      -- quantidade de passageiros
    preco_unitario  DECIMAL(10,2) NOT NULL,          -- preço por passageiro NA HORA da compra, já com desconto
    desconto_pct    TINYINT UNSIGNED NOT NULL DEFAULT 0, -- desconto VIP aplicado (0 se não tinha)
    total           DECIMAL(10,2) NOT NULL,          -- preco_unitario x passageiros
    status          ENUM('ativa', 'cancelada') NOT NULL DEFAULT 'ativa', -- no site cancelar apaga; aqui guardamos o histórico
    criada_em       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cancelada_em    DATETIME NULL,                   -- preenchido só quando cancela
    -- Apagar um usuário apaga as reservas dele; já um voo com reservas não pode ser apagado
    CONSTRAINT fk_res_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario) ON DELETE CASCADE,
    CONSTRAINT fk_res_voo     FOREIGN KEY (id_voo)     REFERENCES voos (id_voo),
    CONSTRAINT chk_res_qtd      CHECK (qtd_passageiros >= 1),
    CONSTRAINT chk_res_desconto CHECK (desconto_pct IN (0, 10, 15, 20, 25)),
    CONSTRAINT chk_res_total    CHECK (total >= 0),
    INDEX idx_res_usuario (id_usuario, status),
    INDEX idx_res_voo (id_voo)
);


-- ============================================================
-- PARTE 5 - PLANEJADOR DE TAREFAS
-- (no site: vrnc_tarefas2, na página inicial)
-- ============================================================

CREATE TABLE tarefas (
    id_tarefa  INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,                                 -- dono da tarefa
    nome       VARCHAR(80) NOT NULL,                         -- o site limita o nome a 80 letras
    descricao  VARCHAR(160) NULL,                            -- opcional, limite de 160 letras
    prioridade ENUM('Alta', 'Média', 'Baixa') NOT NULL DEFAULT 'Média',
    prazo      DATE NULL,                                    -- opcional
    concluida  BOOLEAN NOT NULL DEFAULT FALSE,               -- marcada no checkbox
    criada_em  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tarefas_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario) ON DELETE CASCADE,
    INDEX idx_tarefas_usuario (id_usuario, concluida)
);


-- ============================================================
-- PARTE 6 - SIMULADOR DE IA
-- (no site: vrnc_ia2, EXEMPLOS e AUSENTES do ia.js)
-- ============================================================

-- MENSAGENS_CHAT: a conversa com o assistente ('eu' = visitante, 'ia' = assistente).
-- O site mostra só as 20 últimas (veja a consulta de exemplo no final).
CREATE TABLE mensagens_chat (
    id_mensagem INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario  INT NOT NULL,
    autor       ENUM('eu', 'ia') NOT NULL,
    texto       TEXT NOT NULL,
    criada_em   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_chat_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario) ON DELETE CASCADE,
    INDEX idx_chat_usuario (id_usuario, id_mensagem)
);

-- EXEMPLOS_IA: as frases dos botões de exemplo
CREATE TABLE exemplos_ia (
    id_exemplo INT AUTO_INCREMENT PRIMARY KEY,
    frase      VARCHAR(150) NOT NULL UNIQUE
);

-- CIDADES_INDISPONIVEIS: cidades que o visitante pode pedir, mas que o catálogo não tem.
-- O assistente responde "não encontramos voos" quando o pedido cita uma delas.
CREATE TABLE cidades_indisponiveis (
    id_indisponivel INT AUTO_INCREMENT PRIMARY KEY,
    nome            VARCHAR(60) NOT NULL UNIQUE      -- escrito sem acento e em minúsculas, como no ia.js
);


-- ============================================================
-- PARTE 7 - DADOS INICIAIS
-- ============================================================

-- Estados atendidos
INSERT INTO estados (sigla, nome) VALUES
('SP', 'São Paulo'),
('RJ', 'Rio de Janeiro'),
('MG', 'Minas Gerais');

-- Cidades (a ordem é a mesma da lista CIDADES do site; slug_imagem é o nome da foto)
INSERT INTO cidades (id_cidade, nome, sigla_estado, slug_imagem) VALUES
(1, 'São Paulo', 'SP', 'sao-paulo'),
(2, 'Campinas', 'SP', 'campinas'),
(3, 'Santos', 'SP', 'santos'),
(4, 'Ribeirão Preto', 'SP', 'ribeirao-preto'),
(5, 'São José dos Campos', 'SP', 'sao-jose-dos-campos'),
(6, 'Rio de Janeiro', 'RJ', 'rio-de-janeiro'),
(7, 'Niterói', 'RJ', 'niteroi'),
(8, 'Petrópolis', 'RJ', 'petropolis'),
(9, 'Cabo Frio', 'RJ', 'cabo-frio'),
(10, 'Angra dos Reis', 'RJ', 'angra-dos-reis'),
(11, 'Belo Horizonte', 'MG', 'belo-horizonte'),
(12, 'Uberlândia', 'MG', 'uberlandia'),
(13, 'Ouro Preto', 'MG', 'ouro-preto'),
(14, 'Juiz de Fora', 'MG', 'juiz-de-fora'),
(15, 'Poços de Caldas', 'MG', 'pocos-de-caldas');

-- Companhias aéreas (mesma ordem da lista CIAS do site)
INSERT INTO companhias (id_companhia, nome) VALUES
(1, 'Aerovia Brasil'),
(2, 'Nuvem Air'),
(3, 'Horizonte Linhas Aéreas'),
(4, 'Costa Azul Aéreo'),
(5, 'Planalto Air');

-- Os 75 voos. Foram calculados com a mesma conta da função gerarVoos() do site,
-- então são idênticos aos do catálogo (f1 = id_voo 1, f2 = id_voo 2...).
-- Colunas: id, cidade, companhia, número, saída, chegada, duração (min), preço, assentos_total, assentos
INSERT INTO voos
    (id_voo, id_cidade, id_companhia, numero_voo, saida, chegada, duracao_min, preco, assentos_total, assentos)
VALUES
-- São Paulo (SP)
(1, 1, 1, 'VR1000', '05:00', '05:55', 55, 280.00, 4, 4),
(2, 1, 2, 'VR1001', '09:30', '10:48', 78, 350.00, 15, 15),
(3, 1, 3, 'VR1002', '13:00', '14:41', 101, 420.00, 26, 26),
(4, 1, 4, 'VR1003', '17:30', '19:34', 124, 490.00, 7, 7),
(5, 1, 5, 'VR1004', '21:00', '23:27', 147, 560.00, 18, 18),
-- Campinas (SP)
(6, 2, 2, 'VR1010', '07:15', '08:47', 92, 330.00, 11, 11),
(7, 2, 3, 'VR1011', '11:45', '13:40', 115, 400.00, 22, 22),
(8, 2, 4, 'VR1012', '15:15', '17:33', 138, 480.00, 33, 33),
(9, 2, 5, 'VR1013', '19:45', '22:26', 161, 550.00, 14, 14),
(10, 2, 1, 'VR1014', '06:15', '07:14', 59, 620.00, 25, 25),
-- Santos (SP)
(11, 3, 3, 'VR1020', '09:30', '11:39', 129, 390.00, 18, 18),
(12, 3, 4, 'VR1021', '13:00', '15:32', 152, 460.00, 29, 29),
(13, 3, 5, 'VR1022', '17:30', '20:25', 175, 530.00, 10, 10),
(14, 3, 1, 'VR1023', '21:00', '22:13', 73, 600.00, 21, 21),
(15, 3, 2, 'VR1024', '08:30', '10:06', 96, 670.00, 32, 32),
-- Ribeirão Preto (SP)
(16, 4, 4, 'VR1030', '11:45', '14:31', 166, 440.00, 25, 25),
(17, 4, 5, 'VR1031', '15:15', '16:19', 64, 510.00, 6, 6),
(18, 4, 1, 'VR1032', '19:45', '21:12', 87, 580.00, 17, 17),
(19, 4, 2, 'VR1033', '06:15', '08:05', 110, 650.00, 28, 28),
(20, 4, 3, 'VR1034', '10:45', '12:58', 133, 720.00, 9, 9),
-- São José dos Campos (SP)
(21, 5, 5, 'VR1040', '13:00', '14:18', 78, 490.00, 32, 32),
(22, 5, 1, 'VR1041', '17:30', '19:11', 101, 560.00, 13, 13),
(23, 5, 2, 'VR1042', '21:00', '23:04', 124, 630.00, 24, 24),
(24, 5, 3, 'VR1043', '08:30', '10:57', 147, 710.00, 5, 5),
(25, 5, 4, 'VR1044', '12:00', '14:50', 170, 780.00, 16, 16),
-- Rio de Janeiro (RJ)
(26, 6, 1, 'VR1050', '15:15', '17:10', 115, 550.00, 9, 9),
(27, 6, 2, 'VR1051', '19:45', '22:03', 138, 620.00, 20, 20),
(28, 6, 3, 'VR1052', '06:15', '08:56', 161, 690.00, 31, 31),
(29, 6, 4, 'VR1053', '10:45', '11:44', 59, 760.00, 12, 12),
(30, 6, 5, 'VR1054', '14:15', '15:37', 82, 310.00, 23, 23),
-- Niterói (RJ)
(31, 7, 2, 'VR1060', '17:30', '20:02', 152, 600.00, 16, 16),
(32, 7, 3, 'VR1061', '21:00', '23:55', 175, 670.00, 27, 27),
(33, 7, 4, 'VR1062', '08:30', '09:43', 73, 740.00, 8, 8),
(34, 7, 5, 'VR1063', '12:00', '13:36', 96, 290.00, 19, 19),
(35, 7, 1, 'VR1064', '16:30', '18:29', 119, 360.00, 30, 30),
-- Petrópolis (RJ)
(36, 8, 3, 'VR1070', '19:45', '20:49', 64, 650.00, 23, 23),
(37, 8, 4, 'VR1071', '06:15', '07:42', 87, 720.00, 4, 4),
(38, 8, 5, 'VR1072', '10:45', '12:35', 110, 790.00, 15, 15),
(39, 8, 1, 'VR1073', '14:15', '16:28', 133, 340.00, 26, 26),
(40, 8, 2, 'VR1074', '18:45', '21:21', 156, 420.00, 7, 7),
-- Cabo Frio (RJ)
(41, 9, 4, 'VR1080', '21:00', '22:41', 101, 700.00, 30, 30),
(42, 9, 5, 'VR1081', '08:30', '10:34', 124, 780.00, 11, 11),
(43, 9, 1, 'VR1082', '12:00', '14:27', 147, 330.00, 22, 22),
(44, 9, 2, 'VR1083', '16:30', '19:20', 170, 400.00, 33, 33),
(45, 9, 3, 'VR1084', '20:00', '21:08', 68, 470.00, 14, 14),
-- Angra dos Reis (RJ)
(46, 10, 5, 'VR1090', '06:15', '08:33', 138, 760.00, 7, 7),
(47, 10, 1, 'VR1091', '10:45', '13:26', 161, 310.00, 18, 18),
(48, 10, 2, 'VR1092', '14:15', '15:14', 59, 380.00, 29, 29),
(49, 10, 3, 'VR1093', '18:45', '20:07', 82, 450.00, 10, 10),
(50, 10, 4, 'VR1094', '05:15', '07:00', 105, 520.00, 21, 21),
-- Belo Horizonte (MG)
(51, 11, 1, 'VR1100', '08:30', '11:25', 175, 290.00, 14, 14),
(52, 11, 2, 'VR1101', '12:00', '13:13', 73, 360.00, 25, 25),
(53, 11, 3, 'VR1102', '16:30', '18:06', 96, 430.00, 6, 6),
(54, 11, 4, 'VR1103', '20:00', '21:59', 119, 500.00, 17, 17),
(55, 11, 5, 'VR1104', '07:30', '09:52', 142, 570.00, 28, 28),
-- Uberlândia (MG)
(56, 12, 2, 'VR1110', '10:45', '12:12', 87, 340.00, 21, 21),
(57, 12, 3, 'VR1111', '14:15', '16:05', 110, 410.00, 32, 32),
(58, 12, 4, 'VR1112', '18:45', '20:58', 133, 490.00, 13, 13),
(59, 12, 5, 'VR1113', '05:15', '07:51', 156, 560.00, 24, 24),
(60, 12, 1, 'VR1114', '09:45', '12:44', 179, 630.00, 5, 5),
-- Ouro Preto (MG)
(61, 13, 3, 'VR1120', '12:00', '14:04', 124, 400.00, 28, 28),
(62, 13, 4, 'VR1121', '16:30', '18:57', 147, 470.00, 9, 9),
(63, 13, 5, 'VR1122', '20:00', '22:50', 170, 540.00, 20, 20),
(64, 13, 1, 'VR1123', '07:30', '08:38', 68, 610.00, 31, 31),
(65, 13, 2, 'VR1124', '11:00', '12:31', 91, 680.00, 12, 12),
-- Juiz de Fora (MG)
(66, 14, 4, 'VR1130', '14:15', '16:56', 161, 450.00, 5, 5),
(67, 14, 5, 'VR1131', '18:45', '19:44', 59, 520.00, 16, 16),
(68, 14, 1, 'VR1132', '05:15', '06:37', 82, 590.00, 27, 27),
(69, 14, 2, 'VR1133', '09:45', '11:30', 105, 660.00, 8, 8),
(70, 14, 3, 'VR1134', '13:15', '15:23', 128, 730.00, 19, 19),
-- Poços de Caldas (MG)
(71, 15, 5, 'VR1140', '16:30', '17:43', 73, 500.00, 12, 12),
(72, 15, 1, 'VR1141', '20:00', '21:36', 96, 570.00, 23, 23),
(73, 15, 2, 'VR1142', '07:30', '09:29', 119, 640.00, 4, 4),
(74, 15, 3, 'VR1143', '11:00', '13:22', 142, 720.00, 15, 15),
(75, 15, 4, 'VR1144', '15:30', '18:15', 165, 790.00, 26, 26);

-- Frases dos botões de exemplo do simulador
INSERT INTO exemplos_ia (frase) VALUES
('Quero viajar para São Paulo com até R$ 500.'),
('Encontre um voo barato para Minas Gerais.'),
('Quero viajar para o Rio de Janeiro.'),
('Procure viagens com duração menor que 3 horas.'),
('Quero uma viagem para Campinas.'),
('Encontre os voos mais baratos disponíveis.');

-- Cidades que o catálogo não atende
INSERT INTO cidades_indisponiveis (nome) VALUES
('curitiba'), ('florianopolis'), ('recife'), ('fortaleza'), ('brasilia'),
('manaus'), ('porto alegre'), ('salvador'), ('natal'), ('belem'),
('goiania'), ('vitoria'), ('porto seguro');

-- Um usuário e duas tarefas de exemplo, só para testar
INSERT INTO usuarios (nome, email) VALUES
('Usuário Demo', 'demo@viagenrnc.com');

INSERT INTO tarefas (id_usuario, nome, descricao, prioridade, prazo, concluida) VALUES
(1, 'Organizar documentos', 'RG e comprovantes', 'Alta', DATE_ADD(CURDATE(), INTERVAL 7 DAY), FALSE),
(1, 'Reservar hotel', NULL, 'Média', NULL, FALSE);


-- ============================================================
-- PARTE 8 - GATILHOS (TRIGGERS)
-- Gatilho é um código que o MySQL executa SOZINHO quando algo acontece
-- numa tabela. Aqui eles cuidam dos assentos, como o site faz no
-- comprarPassagem e no cancelarReserva.
-- ============================================================

-- DELIMITER troca o ";" por "$$" só para o MySQL entender que o gatilho
-- inteiro é um comando só (dentro dele existem vários ";").
DELIMITER $$

-- ANTES de gravar uma reserva: confere se o voo existe e se há assentos
CREATE TRIGGER trg_reservas_antes_de_inserir
BEFORE INSERT ON reservas
FOR EACH ROW
BEGIN
    DECLARE v_assentos SMALLINT UNSIGNED;

    IF NEW.status = 'ativa' THEN

        -- Quantos assentos livres o voo tem agora
        SET v_assentos = (SELECT assentos FROM voos WHERE id_voo = NEW.id_voo);

        IF v_assentos IS NULL THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Voo não encontrado.';
        END IF;

        -- SIGNAL cancela o INSERT e devolve a mensagem de erro
        IF NEW.qtd_passageiros > v_assentos THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Não há assentos suficientes neste voo.';
        END IF;

    END IF;
END$$

-- DEPOIS de gravar uma reserva: tira os assentos vendidos do voo
CREATE TRIGGER trg_reservas_depois_de_inserir
AFTER INSERT ON reservas
FOR EACH ROW
BEGIN
    IF NEW.status = 'ativa' THEN
        UPDATE voos
        SET assentos = assentos - NEW.qtd_passageiros
        WHERE id_voo = NEW.id_voo;
    END IF;
END$$

-- DEPOIS de mudar uma reserva: se ela foi cancelada, devolve os assentos ao voo
CREATE TRIGGER trg_reservas_depois_de_atualizar
AFTER UPDATE ON reservas
FOR EACH ROW
BEGIN
    IF OLD.status = 'ativa' AND NEW.status = 'cancelada' THEN
        UPDATE voos
        SET assentos = assentos + OLD.qtd_passageiros
        WHERE id_voo = OLD.id_voo;
    END IF;
END$$


-- ============================================================
-- PARTE 9 - PROCEDIMENTOS (PROCEDURES)
-- Procedimento é uma "função" guardada no banco. Chama-se com CALL.
-- ============================================================

-- ATIVAR VIP (botão "Ativar ViagenRNC VIP"): liga o VIP e sorteia os
-- descontos na primeira vez. Uso: CALL sp_ativar_vip(1);
CREATE PROCEDURE sp_ativar_vip(IN p_id_usuario INT)
BEGIN
    -- Liga o VIP e anota a hora
    UPDATE usuarios
    SET vip_ativo = TRUE, vip_ativado_em = NOW()
    WHERE id_usuario = p_id_usuario;

    -- Só sorteia se o usuário ainda não tem descontos (o sorteio é uma vez só)
    IF NOT EXISTS (SELECT 1 FROM descontos_vip WHERE id_usuario = p_id_usuario) THEN

        -- Embaralha os voos (ORDER BY RAND), pega 15 (20% dos 75)
        -- e sorteia 10, 15, 20 ou 25 por cento para cada um
        INSERT INTO descontos_vip (id_usuario, id_voo, percentual)
        SELECT p_id_usuario, id_voo, 10 + 5 * FLOOR(RAND() * 4)
        FROM voos
        ORDER BY RAND()
        LIMIT 15;

    END IF;
END$$

-- DESATIVAR VIP (botão de teste). Os descontos sorteados continuam salvos,
-- como no site. Uso: CALL sp_desativar_vip(1);
CREATE PROCEDURE sp_desativar_vip(IN p_id_usuario INT)
BEGIN
    UPDATE usuarios
    SET vip_ativo = FALSE
    WHERE id_usuario = p_id_usuario;
END$$

-- COMPRAR PASSAGEM (botão "Confirmar Compra"): valida os dados, calcula o
-- total com o desconto VIP e grava a reserva. Os assentos são descontados
-- pelo gatilho. O código gerado volta no parâmetro de saída p_codigo.
CREATE PROCEDURE sp_comprar_passagem(
    IN  p_id_usuario INT,
    IN  p_id_voo     INT,
    IN  p_nome       VARCHAR(100),
    IN  p_email      VARCHAR(150),
    IN  p_data_viagem DATE,
    IN  p_qtd        SMALLINT UNSIGNED,
    OUT p_codigo     VARCHAR(11)
)
BEGIN
    DECLARE v_preco DECIMAL(10,2);
    DECLARE v_pct   TINYINT UNSIGNED;
    DECLARE v_final DECIMAL(10,2);

    -- Mesmas validações do formulário do site
    IF CHAR_LENGTH(TRIM(p_nome)) < 3 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Informe o nome completo do comprador.';
    END IF;

    IF p_email NOT REGEXP '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Informe um e-mail válido.';
    END IF;

    IF p_data_viagem IS NULL OR p_data_viagem < CURDATE() THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Escolha uma data de viagem a partir de hoje.';
    END IF;

    IF p_qtd IS NULL OR p_qtd < 1 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Informe a quantidade de passageiros.';
    END IF;

    -- Preço do voo (fica NULL se o voo não existir)
    SET v_preco = (SELECT preco FROM voos WHERE id_voo = p_id_voo);

    IF v_preco IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Voo não encontrado.';
    END IF;

    -- Desconto: só vale se o usuário estiver com o VIP ativo e o voo tiver sido sorteado
    SET v_pct = COALESCE((
        SELECT d.percentual
        FROM descontos_vip d
        JOIN usuarios u ON u.id_usuario = d.id_usuario
        WHERE d.id_usuario = p_id_usuario
          AND d.id_voo = p_id_voo
          AND u.vip_ativo = TRUE
    ), 0);

    -- Preço por passageiro já com desconto (mesma conta do infoPreco do site)
    SET v_final = ROUND(v_preco * (100 - v_pct) / 100, 2);

    -- Código no formato VRNC- + 6 caracteres sorteados em maiúsculas
    SET p_codigo = CONCAT('VRNC-', UPPER(SUBSTRING(MD5(RAND()), 1, 6)));

    -- Grava a reserva (o gatilho confere e tira os assentos)
    INSERT INTO reservas
        (codigo, id_usuario, id_voo, nome_comprador, email_comprador,
         data_viagem, qtd_passageiros, preco_unitario, desconto_pct, total)
    VALUES
        (p_codigo, p_id_usuario, p_id_voo, TRIM(p_nome), TRIM(p_email),
         p_data_viagem, p_qtd, v_final, v_pct, ROUND(v_final * p_qtd, 2));
END$$

-- CANCELAR RESERVA (botão "Cancelar reserva"): marca como cancelada.
-- O gatilho devolve os assentos ao voo. Uso: CALL sp_cancelar_reserva('VRNC-A1B2C3');
CREATE PROCEDURE sp_cancelar_reserva(IN p_codigo VARCHAR(11))
BEGIN
    DECLARE v_status VARCHAR(10);

    SET v_status = (SELECT status FROM reservas WHERE codigo = p_codigo);

    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Reserva não encontrada.';
    END IF;

    IF v_status = 'cancelada' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Esta reserva já foi cancelada.';
    END IF;

    UPDATE reservas
    SET status = 'cancelada', cancelada_em = NOW()
    WHERE codigo = p_codigo;
END$$

-- Volta o ";" como separador normal
DELIMITER ;


-- ============================================================
-- PARTE 10 - VIEWS
-- View é uma consulta guardada com nome. Funciona como uma tabela
-- "virtual" que junta dados de várias tabelas.
-- ============================================================

-- VW_VOOS_COMPLETOS: o voo com cidade, estado e companhia já juntos,
-- e a duração em texto (2h05), como aparece nos cards do site.
CREATE VIEW vw_voos_completos AS
SELECT
    v.id_voo,
    CONCAT('f', v.id_voo) AS id_site,                       -- id usado no site (f1, f2...)
    c.nome AS cidade,
    e.sigla AS estado,
    e.nome AS estado_nome,
    co.nome AS companhia,
    v.numero_voo,
    TIME_FORMAT(v.saida, '%H:%i') AS saida,
    TIME_FORMAT(v.chegada, '%H:%i') AS chegada,
    v.duracao_min,
    CONCAT(FLOOR(v.duracao_min / 60), 'h', LPAD(MOD(v.duracao_min, 60), 2, '0')) AS duracao,
    v.preco,
    v.assentos,
    c.slug_imagem
FROM voos v
JOIN cidades c     ON c.id_cidade = v.id_cidade
JOIN estados e     ON e.sigla = c.sigla_estado
JOIN companhias co ON co.id_companhia = v.id_companhia;

-- VW_PRECOS_VIP: para cada usuário e voo, o preço original, o desconto e o
-- preço final. O desconto só aparece se o VIP estiver ativo (função infoPreco do site).
CREATE VIEW vw_precos_vip AS
SELECT
    t.id_usuario,
    t.id_voo,
    t.preco_original,
    t.desconto_pct,
    ROUND(t.preco_original * (100 - t.desconto_pct) / 100, 2) AS preco_final
FROM (
    SELECT
        u.id_usuario,
        v.id_voo,
        v.preco AS preco_original,
        COALESCE(IF(u.vip_ativo, d.percentual, 0), 0) AS desconto_pct
    FROM usuarios u
    CROSS JOIN voos v
    LEFT JOIN descontos_vip d
           ON d.id_usuario = u.id_usuario AND d.id_voo = v.id_voo
) t;

-- VW_RESERVAS_DETALHE: a lista "Minhas reservas" com os dados do voo
CREATE VIEW vw_reservas_detalhe AS
SELECT
    r.id_reserva,
    r.id_usuario,
    r.codigo,
    r.status,
    c.nome AS cidade,
    c.sigla_estado AS estado,
    co.nome AS companhia,
    v.numero_voo,
    r.nome_comprador,
    r.data_viagem,
    r.qtd_passageiros,
    r.desconto_pct,
    r.total,
    r.criada_em
FROM reservas r
JOIN voos v        ON v.id_voo = r.id_voo
JOIN cidades c     ON c.id_cidade = v.id_cidade
JOIN companhias co ON co.id_companhia = v.id_companhia;


-- ============================================================
-- PARTE 11 - CONSULTAS DE EXEMPLO (estão comentadas com --)
-- Tire o "-- " do começo da linha para executar.
-- ============================================================

-- Todos os voos de São Paulo (SP) até R$ 500, do mais barato ao mais caro
-- (página Explorar Viagens: filtros de estado e preço máximo)
-- SELECT cidade, companhia, saida, preco FROM vw_voos_completos
-- WHERE estado = 'SP' AND preco <= 500 ORDER BY preco;

-- Voos com partida a partir das 10:00 de uma companhia (filtros de horário e companhia)
-- SELECT cidade, saida, preco FROM vw_voos_completos
-- WHERE companhia = 'Nuvem Air' AND saida >= '10:00' ORDER BY saida;

-- Voos mais rápidos primeiro, só os que ainda têm assento (ordenar por duração)
-- SELECT cidade, duracao, assentos FROM vw_voos_completos
-- WHERE assentos > 0 ORDER BY duracao_min LIMIT 12;

-- Preço final do usuário 1 (com desconto VIP, se estiver ativo)
-- SELECT v.cidade, p.preco_original, p.desconto_pct, p.preco_final
-- FROM vw_precos_vip p JOIN vw_voos_completos v ON v.id_voo = p.id_voo
-- WHERE p.id_usuario = 1 ORDER BY p.preco_final;

-- Os números da página Sobre (voos, cidades, estados e companhias)
-- SELECT COUNT(*) AS voos, COUNT(DISTINCT id_cidade) AS cidades,
--        (SELECT COUNT(*) FROM estados) AS estados,
--        COUNT(DISTINCT id_companhia) AS companhias
-- FROM voos;

-- Fluxo completo: ativar VIP, comprar, ver as reservas e cancelar
-- CALL sp_ativar_vip(1);
-- CALL sp_comprar_passagem(1, 1, 'Maria Silva', 'maria@email.com', DATE_ADD(CURDATE(), INTERVAL 30 DAY), 2, @codigo);
-- SELECT @codigo;
-- SELECT * FROM vw_reservas_detalhe WHERE id_usuario = 1;
-- SELECT assentos FROM voos WHERE id_voo = 1;        -- diminuiu 2
-- CALL sp_cancelar_reserva(@codigo);
-- SELECT assentos FROM voos WHERE id_voo = 1;        -- voltou ao valor de antes

-- Progresso das tarefas: total, concluídas e a porcentagem da barra
-- SELECT COUNT(*) AS total, SUM(concluida) AS concluidas,
--        ROUND(100 * SUM(concluida) / COUNT(*)) AS porcentagem
-- FROM tarefas WHERE id_usuario = 1;

-- Tarefas atrasadas (prazo passou e ainda não concluídas)
-- SELECT nome, prazo FROM tarefas
-- WHERE id_usuario = 1 AND concluida = FALSE AND prazo < CURDATE();

-- As 20 últimas mensagens do chat, na ordem em que foram escritas
-- SELECT * FROM (
--     SELECT autor, texto, id_mensagem FROM mensagens_chat
--     WHERE id_usuario = 1 ORDER BY id_mensagem DESC LIMIT 20
-- ) ultimas
-- ORDER BY id_mensagem;
