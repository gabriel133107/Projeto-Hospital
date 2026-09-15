-- Esquema SQL gerado para o Projeto Clínica TRB
-- Formato: SQLite (pode ser usado/adaptado para outros SGDBs)

PRAGMA foreign_keys = ON;

-- Tabela principal de usuários (todos os perfis: admin, profissional, paciente)
CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    perfil TEXT NOT NULL CHECK(perfil IN ('admin','profissional','paciente')),
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    senha_hash TEXT NOT NULL,
    telefone TEXT,
    criado_em DATETIME DEFAULT (datetime('now'))
);

-- Tabela de especialidades (médicas, odontológicas, etc.)
CREATE TABLE IF NOT EXISTS especialidades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL UNIQUE
);

-- Tabela de profissionais: referência para usuarios
CREATE TABLE IF NOT EXISTS profissionais (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL UNIQUE,
    registro TEXT, -- CRM/CRO etc.
    especialidade_id INTEGER,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (especialidade_id) REFERENCES especialidades(id)
);

-- Tabela de pacientes: referência para usuarios
CREATE TABLE IF NOT EXISTS pacientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL UNIQUE,
    cpf TEXT UNIQUE,
    data_nascimento DATE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Tabela de consultas (agendamentos)
CREATE TABLE IF NOT EXISTS consultas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    paciente_id INTEGER NOT NULL,
    profissional_id INTEGER NOT NULL,
    especialidade_id INTEGER,
    data_consulta DATE NOT NULL,
    horario TIME NOT NULL,
    situacao TEXT NOT NULL DEFAULT 'Agendada', -- Agendada, Realizada, Cancelada
    observacao TEXT,
    criado_em DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE,
    FOREIGN KEY (profissional_id) REFERENCES profissionais(id) ON DELETE CASCADE,
    FOREIGN KEY (especialidade_id) REFERENCES especialidades(id)
);

-- Índices para acelerar buscas comuns
CREATE INDEX IF NOT EXISTS idx_consultas_data ON consultas(data_consulta);
CREATE INDEX IF NOT EXISTS idx_pacientes_cpf ON pacientes(cpf);
CREATE INDEX IF NOT EXISTS idx_profissionais_esp ON profissionais(especialidade_id);

-- Dados de exemplo
INSERT OR IGNORE INTO especialidades (id, nome) VALUES
    (1, 'Clínico Geral'),
    (2, 'Cardiologia'),
    (3, 'Pediatria'),
    (4, 'Odontologia');

-- Exemplos de usuários (as senhas estão como hash fictício — substituir por hash real ao importar)
INSERT OR IGNORE INTO usuarios (id, perfil, nome, email, senha_hash, telefone) VALUES
    (1, 'admin', 'Admin Sistema', 'admin@clinica.test', 'HASH_DUMMY_ADMIN', '+5511999990000'),
    (2, 'paciente', 'João da Silva', 'joao.silva@example.com', 'HASH_DUMMY_PACIENTE', '+5511988880000'),
    (3, 'profissional', 'Dra. Maria Souza', 'maria.souza@clinica.test', 'HASH_DUMMY_PROF', '+5511977770000');

-- Vincular paciente e profissional às tabelas específicas
INSERT OR IGNORE INTO pacientes (id, usuario_id, cpf, data_nascimento) VALUES
    (1, 2, '12345678901', '1985-04-12');

INSERT OR IGNORE INTO profissionais (id, usuario_id, registro, especialidade_id) VALUES
    (1, 3, '987654', 1);

-- Exemplo de agendamento
INSERT OR IGNORE INTO consultas (id, paciente_id, profissional_id, especialidade_id, data_consulta, horario, situacao, observacao) VALUES
    (1, 1, 1, 1, '2026-09-20', '10:30', 'Agendada', 'Consulta inicial');

-- Instruções de uso rápido (comentadas):
-- 1) Criar um arquivo SQLite e executar este script: sqlite3 clinica.db < schema.sql
-- 2) Ou importar os comandos em outro SGDB adaptando tipos e funções de data.

-- FIM do schema
