-- Schema MySQL compatível com o projeto Clínica TRB
-- Ajustes feitos: tipos MySQL, ENGINE=InnoDB, DEFAULT CURRENT_TIMESTAMP, ENUMs, INSERT IGNORE

CREATE DATABASE IF NOT EXISTS clinica DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE clinica;

-- Tabela principal de usuários
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  perfil ENUM('admin','profissional','paciente') NOT NULL,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  telefone VARCHAR(50),
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabela de especialidades
CREATE TABLE IF NOT EXISTS especialidades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabela de profissionais: referência para usuarios
CREATE TABLE IF NOT EXISTS profissionais (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL UNIQUE,
  registro VARCHAR(50),
  especialidade_id INT,
  CONSTRAINT fk_prof_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_prof_esp FOREIGN KEY (especialidade_id) REFERENCES especialidades(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabela de pacientes: referência para usuarios
CREATE TABLE IF NOT EXISTS pacientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL UNIQUE,
  cpf VARCHAR(20) UNIQUE,
  data_nascimento DATE,
  CONSTRAINT fk_pac_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabela de consultas (agendamentos)
CREATE TABLE IF NOT EXISTS consultas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  paciente_id INT NOT NULL,
  profissional_id INT NOT NULL,
  especialidade_id INT,
  data_consulta DATE NOT NULL,
  horario TIME NOT NULL,
  situacao ENUM('Agendada','Realizada','Cancelada') NOT NULL DEFAULT 'Agendada',
  observacao TEXT,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cons_paciente FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE,
  CONSTRAINT fk_cons_profissional FOREIGN KEY (profissional_id) REFERENCES profissionais(id) ON DELETE CASCADE,
  CONSTRAINT fk_cons_esp FOREIGN KEY (especialidade_id) REFERENCES especialidades(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Índices
CREATE INDEX idx_consultas_data ON consultas (data_consulta);
CREATE INDEX idx_pacientes_cpf ON pacientes (cpf);
CREATE INDEX idx_profissionais_esp ON profissionais (especialidade_id);

-- Dados de exemplo (usar INSERT IGNORE para evitar erros em re-importações)
INSERT IGNORE INTO especialidades (id, nome) VALUES
  (1, 'Clínico Geral'),
  (2, 'Cardiologia'),
  (3, 'Pediatria'),
  (4, 'Odontologia');

INSERT IGNORE INTO usuarios (id, perfil, nome, email, senha_hash, telefone) VALUES
  (1, 'admin', 'Admin Sistema', 'admin@clinica.test', 'HASH_DUMMY_ADMIN', '+5511999990000'),
  (2, 'paciente', 'João da Silva', 'joao.silva@example.com', 'HASH_DUMMY_PACIENTE', '+5511988880000'),
  (3, 'profissional', 'Dra. Maria Souza', 'maria.souza@clinica.test', 'HASH_DUMMY_PROF', '+5511977770000');

INSERT IGNORE INTO pacientes (id, usuario_id, cpf, data_nascimento) VALUES
  (1, 2, '12345678901', '1985-04-12');

INSERT IGNORE INTO profissionais (id, usuario_id, registro, especialidade_id) VALUES
  (1, 3, '987654', 1);

INSERT IGNORE INTO consultas (id, paciente_id, profissional_id, especialidade_id, data_consulta, horario, situacao, observacao) VALUES
  (1, 1, 1, 1, '2026-09-20', '10:30:00', 'Agendada', 'Consulta inicial');

-- Observação: substitua os valores de senha_hash por hashes reais (bcrypt/argon2) antes de usar em produção.
-- Uso: no terminal com cliente mysql instalado: mysql -u <user> -p < schema_mysql.sql
-- Ou conectar ao servidor MySQL e executar: SOURCE /caminho/para/schema_mysql.sql
