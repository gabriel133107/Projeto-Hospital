const API_BASE = 'http://localhost:8080/api';
let usuariosCadastrados = JSON.parse(localStorage.getItem('clinica_v2_users')) || [];
let consultas = [];
let logsAuditoria = JSON.parse(localStorage.getItem('clinica_v2_auditoria')) || []; 

let pacientes = [];
let profissionais = [];
let especialidadesRemotas = [];

async function carregarDadosRemotos() {
    try {
        const [pacRes, profRes, espRes, consRes] = await Promise.all([
            fetch(`${API_BASE}/pacientes`),
            fetch(`${API_BASE}/profissionais`),
            fetch(`${API_BASE}/especialidades`),
            fetch(`${API_BASE}/consultas`)
        ]);

        if (pacRes.ok) pacientes = await pacRes.json(); else pacientes = [];
        if (profRes.ok) profissionais = await profRes.json(); else profissionais = [];
        if (espRes.ok) especialidadesRemotas = await espRes.json(); else especialidadesRemotas = [];
        if (consRes.ok) consultas = await consRes.json(); else consultas = [];

        // Normalize objects to match existing frontend expectations (id, nome, cpf, etc.)
        pacientes = pacientes.map(p => ({ id: p.id?.toString(), nome: p.usuario?.nome || p.usuarioName || p.nome || '', cpf: p.cpf || '', telefone: p.usuario?.telefone || '' , nascimento: p.dataNascimento }));
        profissionais = profissionais.map(p => ({ id: p.id?.toString(), nome: p.usuario?.nome || p.usuarioName || p.nome || '', especialidade: p.especialidade?.nome || p.especialidade || '', telefone: p.usuario?.telefone || '' }));

        // Consultas: map fields to expected names
        consultas = consultas.map(c => ({ id: c.id?.toString(), idPaciente: c.paciente?.id?.toString(), idProfissional: c.profissional?.id?.toString(), especialidade: c.especialidade?.nome || (c.especialidade || ''), data: c.dataConsulta, horario: c.horario, situacao: c.situacao, observacao: c.observacao }));

    } catch (err) {
        console.error('Erro ao carregar dados remotos:', err);
    }
}


if (usuariosCadastrados.length === 0) {
    usuariosCadastrados = [
        { id: '1000', email: 'admin@clinica.com', senha: '123', perfil: 'admin', nome: 'Administrador do Sistema' }
    ];
    localStorage.setItem('clinica_v2_users', JSON.stringify(usuariosCadastrados));
}

// pacientes and profissionais are loaded from backend (carregarDadosRemotos)
// Keep local fallback from usuariosCadastrados when backend not available
let pacientes = [];
let profissionais = [];

let usuarioLogado = JSON.parse(localStorage.getItem('clinica_v2_sessao')) || null;
let abaAtiva = localStorage.getItem('clinica_v2_aba_ativa') || 'dashboard';

window.onload = async () => {
    await carregarDadosRemotos();
    configurarEspecialidades(); 
    configurarValidacoesInputs(); 
    configurarCascataEspecialidade(); 

    if (usuarioLogado) {
        document.getElementById('tela-login').classList.add('oculto');
        document.getElementById('conteudo-sistema').classList.remove('oculto');
        
        let labelPerfil = usuarioLogado.perfil === 'admin' ? 'Administrador' : usuarioLogado.perfil === 'profissional' ? 'Médico' : 'Paciente';
        let icone = usuarioLogado.perfil === 'admin' ? 'fa-user-tie' : usuarioLogado.perfil === 'profissional' ? 'fa-user-doctor' : 'fa-user';
        
        document.getElementById('nome-usuario-logado').innerHTML = `
            <div class="avatar-icon" style="display:inline; margin-right:5px;"><i class="fa-solid ${icone}"></i></div>
            <span><strong>${usuarioLogado.nome}</strong> (${labelPerfil})</span>
        `;

        aplicarPermissoes(usuarioLogado.perfil);
        carregarSelects();
        mostrarAba(abaAtiva); 
    }
};

function registrarAuditoria(acao, registroAfetado, detalhes) {
    const log = {
        dataHora: new Date().toLocaleString(),
        usuarioResponsavel: usuarioLogado ? usuarioLogado.nome : 'Visitante',
        acao: acao,
        registroAfetado: registroAfetado,
        detalhes: detalhes
    };
    logsAuditoria.push(log);
    localStorage.setItem('clinica_v2_auditoria', JSON.stringify(logsAuditoria));
}

function configurarEspecialidades() {
    const especialidades = (especialidadesRemotas && especialidadesRemotas.length) ? especialidadesRemotas.map(e => e.nome) : [
        "Cardiologia", "Pediatria", "Nutrição", "Odontologia", 
        "Dermatologia", "Ginecologia", "Ortopedia", "Oftalmologia", 
        "Psiquiatria", "Clínica Médica"
    ];
    
    let optionsHTML = '<option value="" disabled selected>Selecione a especialidade...</option>';
    especialidades.forEach(esp => { optionsHTML += `<option value="${esp}">${esp}</option>`; });

    const cadEspecialidade = document.getElementById('cad-especialidade');
    if (cadEspecialidade) cadEspecialidade.innerHTML = optionsHTML;
    
    const editEspecialidade = document.getElementById('edit-especialidade');
    if (editEspecialidade) editEspecialidade.innerHTML = optionsHTML;

    const consEspecialidade = document.getElementById('cons-especialidade');
    if (consEspecialidade) consEspecialidade.innerHTML = '<option value="" disabled selected>1º Selecione a especialidade...</option>' + optionsHTML;
}

function configurarValidacoesInputs() {
    const camposNome = ['cad-nome', 'edit-nome'];
    camposNome.forEach(id => {
        const inputNome = document.getElementById(id);
        if (inputNome) {
            inputNome.addEventListener('input', function() {
                this.value = this.value.replace(/[0-9]/g, ''); 
            });
        }
    });

    const campoRegistro = document.getElementById('cad-registro');
    if (campoRegistro) {
        campoRegistro.addEventListener('input', function() {
            this.value = this.value.replace(/[^0-9]/g, ''); 
        });
    }
}

function configurarCascataEspecialidade() {
    const selectEsp = document.getElementById('cons-especialidade');
    const selectProf = document.getElementById('cons-profissional');
    
    if (!selectEsp || !selectProf) return;

    selectEsp.addEventListener('change', function() {
        const especialidadeSelecionada = this.value;
        selectProf.innerHTML = '<option value="">2º Selecione o especialista...</option>';
        
        if (!especialidadeSelecionada) {
            selectProf.innerHTML = '<option value="" disabled selected>Selecione uma especialidade primeiro...</option>';
            selectProf.disabled = true;
            return;
        }

        const profissionaisFiltrados = profissionais.filter(p => p.especialidade === especialidadeSelecionada);
        
        if (profissionaisFiltrados.length === 0) {
            selectProf.innerHTML = '<option value="" disabled selected>Nenhum especialista encontrado.</option>';
            selectProf.disabled = true;
        } else {
            selectProf.disabled = false;
            profissionaisFiltrados.forEach(p => {
                selectProf.innerHTML += `<option value="${p.id}">${p.nome}</option>`;
            });
        }
    });
}

function mostrarToast(mensagem, tipo = 'sucesso') {
    const toast = document.getElementById('toast-notificacao');
    if (tipo === 'erro') {
        toast.style.backgroundColor = '#d32f2f';
        toast.style.color = '#fff';
        toast.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${mensagem}`;
    } else {
        toast.style.backgroundColor = '#2e7d32';
        toast.style.color = '#fff';
        toast.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${mensagem}`;
    }
    toast.classList.remove('oculto');
    setTimeout(() => toast.classList.add('oculto'), 4000);
}

function mascaraCPF(input) {
    let value = input.value.replace(/\D/g, ''); 
    if (value.length > 11) value = value.slice(0, 11);
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    input.value = value;
}

function mascaraTelefone(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
    value = value.replace(/(\d{5})(\d)/, '$1-$2');
    input.value = value;
}

function calcularIdade(dataNascimento) {
    if (!dataNascimento) return '';
    const hoje = new Date();
    const nascimento = new Date(dataNascimento);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const m = hoje.getMonth() - nascimento.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) idade--;
    return idade;
}

function validarEmailConfigurado(email) {
    const dominios = ['@gmail.com', '@outlook.com', '@yahoo.com', '@hotmail.com'];
    return dominios.some(dominio => email.endsWith(dominio));
}

function atualizarBanco() {
    localStorage.setItem('clinica_v2_users', JSON.stringify(usuariosCadastrados));
    // consultas agora vêm do backend; não sobrescrever pelo localStorage
    pacientes = usuariosCadastrados.filter(u => u.perfil === 'paciente');
    profissionais = usuariosCadastrados.filter(u => u.perfil === 'profissional');
}

function mostrarAba(aba) {
    document.querySelectorAll('.content section').forEach(sec => sec.classList.add('oculto'));
    document.querySelectorAll('.sidebar button').forEach(btn => btn.classList.remove('ativo'));
    
    document.getElementById(`aba-${aba}`).classList.remove('oculto');
    document.getElementById(`btn-nav-${aba}`).classList.add('ativo');
    
    localStorage.setItem('clinica_v2_aba_ativa', aba);

    if(aba === 'dashboard') renderizarDashboard();
    if(aba === 'pacientes') renderizarPacientes();
    if(aba === 'profissionais') renderizarProfissionais();
    if(aba === 'consultas') renderizarConsultas();
}

function mostrarCadastro(event) {
    if(event) event.preventDefault();
    document.getElementById('box-login').classList.add('oculto');
    document.getElementById('box-cadastro').classList.remove('oculto');
}

function mostrarLogin(event) {
    if(event) event.preventDefault();
    document.getElementById('box-cadastro').classList.add('oculto');
    document.getElementById('box-login').classList.remove('oculto');
}

function mudarCamposCadastro() {
    const perfil = document.getElementById('cad-perfil').value;
    const boxPaciente = document.getElementById('campos-paciente');
    const boxProfissional = document.getElementById('campos-profissional');
    
    document.getElementById('cad-cpf').required = false;
    document.getElementById('cad-telefone').required = false;
    document.getElementById('cad-nascimento').required = false;
    document.getElementById('cad-registro').required = false;
    document.getElementById('cad-especialidade').required = false;

    boxPaciente.classList.add('oculto');
    boxProfissional.classList.add('oculto');

    if (perfil === 'paciente') {
        boxPaciente.classList.remove('oculto');
        document.getElementById('cad-cpf').required = true;
        document.getElementById('cad-telefone').required = true;
        document.getElementById('cad-nascimento').required = true;
    } else if (perfil === 'profissional') {
        boxProfissional.classList.remove('oculto');
        document.getElementById('cad-registro').required = true;
        document.getElementById('cad-especialidade').required = true;
    }
}

function realizarCadastro(event) {
    event.preventDefault();
    const email = document.getElementById('cad-email').value.trim().toLowerCase();
    const senha = document.getElementById('cad-senha').value;
    const perfil = document.getElementById('cad-perfil').value;
    const cpf = document.getElementById('cad-cpf').value;
    const telefone = document.getElementById('cad-telefone').value;
    const nascimento = document.getElementById('cad-nascimento').value;
    
    if (!validarEmailConfigurado(email)) return mostrarToast("Utilize um domínio de e-mail válido (ex: @gmail.com).", "erro"); 

    const regexSenhaForte = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    if (!regexSenhaForte.test(senha)) return mostrarToast("A senha deve ter no mínimo 8 caracteres, maiúsculas, minúsculas, números e caracteres especiais.", "erro");

    if (perfil === 'paciente' && nascimento) {
        if (new Date(nascimento) > new Date()) {
            return mostrarToast("A data de nascimento não pode estar no futuro.", "erro");
        }
    }

    if (usuariosCadastrados.some(user => user.email === email)) return mostrarToast("E-mail já cadastrado!", "erro");
    if (telefone && usuariosCadastrados.some(user => user.telefone === telefone)) return mostrarToast("Telefone já cadastrado!", "erro");
    if (perfil === 'paciente' && cpf && usuariosCadastrados.some(user => user.cpf === cpf)) return mostrarToast("CPF já cadastrado!", "erro");

    const novoUsuario = { 
        id: Math.floor(1000 + Math.random() * 9000).toString(),
        email, senha, perfil, 
        nome: document.getElementById('cad-nome').value.trim(),
        cpf, telefone,
        nascimento: nascimento,
        registro: document.getElementById('cad-registro').value,
        especialidade: document.getElementById('cad-especialidade').value
    };

    usuariosCadastrados.push(novoUsuario);
    atualizarBanco();
    registrarAuditoria("Criação de Usuário", novoUsuario.id, `Perfil: ${perfil}, Nome: ${novoUsuario.nome}`); 
    
    mostrarToast("Conta criada com sucesso! Faça login.");
    document.getElementById('form-cadastro').reset();
    mostrarLogin();
}

function realizarLogin(event) {
    event.preventDefault();
    const email = document.getElementById('login-usuario').value.trim().toLowerCase();
    const senha = document.getElementById('login-senha').value;
    const perfil = document.getElementById('login-perfil').value;

    const user = usuariosCadastrados.find(u => u.email === email);
    if (!user) return mostrarToast("Usuário não encontrado!", "erro");
    if (user.senha !== senha) return mostrarToast("Senha incorreta!", "erro");
    if (user.perfil !== perfil) return mostrarToast("Perfil incorreto!", "erro");

    usuarioLogado = user;
    localStorage.setItem('clinica_v2_sessao', JSON.stringify(usuarioLogado)); 

    window.location.reload(); 
}

function realizarLogout() {
    usuarioLogado = null;
    localStorage.removeItem('clinica_v2_sessao');
    localStorage.removeItem('clinica_v2_aba_ativa');
    window.location.reload();
}

function aplicarPermissoes(perfil) {
    const bPac = document.getElementById('btn-nav-pacientes');
    const bProf = document.getElementById('btn-nav-profissionais');
    bPac.style.display = (perfil === 'admin' || perfil === 'profissional') ? 'block' : 'none';
    bProf.style.display = (perfil === 'admin') ? 'block' : 'none';
}

function renderizarDashboard() {
    const hoje = new Date().toISOString().split('T')[0];
    let consultasVisiveis = consultas;
    if (usuarioLogado.perfil === 'paciente') consultasVisiveis = consultas.filter(c => c.idPaciente === usuarioLogado.id);
    else if (usuarioLogado.perfil === 'profissional') consultasVisiveis = consultas.filter(c => c.idProfissional === usuarioLogado.id);

    document.getElementById('dash-consultas-hoje').textContent = consultasVisiveis.filter(c => c.data === hoje && c.situacao !== 'Cancelada').length;
    document.getElementById('dash-consultas-agendadas').textContent = consultasVisiveis.filter(c => c.situacao === 'Agendada').length;
    document.getElementById('dash-total-pacientes').textContent = pacientes.length;
    document.getElementById('dash-total-profissionais').textContent = profissionais.length;
}

function carregarSelects() {
    const selPaciente = document.getElementById('cons-paciente');
    selPaciente.innerHTML = '<option value="">Selecione o paciente...</option>';
    if(usuarioLogado.perfil === 'paciente') {
        selPaciente.innerHTML += `<option value="${usuarioLogado.id}" selected>${usuarioLogado.nome}</option>`;
        selPaciente.disabled = true;
    } else {
        selPaciente.disabled = false;
        pacientes.forEach(p => selPaciente.innerHTML += `<option value="${p.id}">${p.nome} (CPF: ${p.cpf})</option>`);
    }
}

function renderizarConsultas() {
    const tbody = document.getElementById('tabela-consultas');
    const termo = document.getElementById('pesquisa-consulta').value.toLowerCase();
    tbody.innerHTML = '';

    let filtradas = consultas;
    if (usuarioLogado.perfil === 'paciente') filtradas = consultas.filter(c => c.idPaciente === usuarioLogado.id);
    else if (usuarioLogado.perfil === 'profissional') filtradas = consultas.filter(c => c.idProfissional === usuarioLogado.id);

    if (termo) filtradas = filtradas.filter(c => c.especialidade.toLowerCase().includes(termo) || c.situacao.toLowerCase().includes(termo));
    filtradas.sort((a, b) => new Date(b.data) - new Date(a.data));

    filtradas.forEach(c => {
        const nomePac = pacientes.find(p => p.id === c.idPaciente)?.nome || 'Excluído';
        const nomeProf = profissionais.find(p => p.id === c.idProfissional)?.nome || 'Excluído';
        let badge = c.situacao === 'Realizada' ? 'badge-realizada' : c.situacao === 'Cancelada' ? 'badge-cancelada' : 'badge-agendada';

        tbody.innerHTML += `
            <tr>
                <td>#${c.id}</td><td>${nomePac}</td><td>${nomeProf}</td><td>${c.especialidade}</td>
                <td>${c.data.split('-').reverse().join('/')}</td><td>${c.horario}</td>
                <td><span class="badge ${badge}">${c.situacao}</span></td>
                <td>
                    <button class="btn-acao btn-edit" onclick="editarConsulta('${c.id}')"><i class="fa-solid fa-pen"></i></button>
                    ${c.situacao !== 'Cancelada' ? `<button class="btn-acao btn-delete" onclick="cancelarConsulta('${c.id}')"><i class="fa-solid fa-ban"></i></button>` : ''}
                </td>
            </tr>
        `;
    });
}

function renderizarPacientes() {
    const tbody = document.getElementById('tabela-pacientes');
    const termo = document.getElementById('pesquisa-paciente').value.toLowerCase();
    tbody.innerHTML = '';
    let filtrados = termo ? pacientes.filter(p => p.nome.toLowerCase().includes(termo) || p.cpf.includes(termo)) : pacientes;

    filtrados.forEach(p => {
        const idade = p.nascimento ? `${p.nascimento.split('-').reverse().join('/')} (${calcularIdade(p.nascimento)} anos)` : '-'; 
        tbody.innerHTML += `<tr><td>#${p.id}</td><td>${p.nome}</td><td>${p.cpf}</td><td>${idade}</td><td>${p.telefone}</td><td><button class="btn-acao btn-edit" onclick="editarUsuario('${p.id}')"><i class="fa-solid fa-pen"></i></button></td></tr>`;
    });
}

function renderizarProfissionais() {
    const tbody = document.getElementById('tabela-profissionais');
    const termo = document.getElementById('pesquisa-profissional').value.toLowerCase();
    tbody.innerHTML = '';
    let filtrados = termo ? profissionais.filter(p => p.nome.toLowerCase().includes(termo) || p.especialidade.toLowerCase().includes(termo)) : profissionais;

    filtrados.forEach(p => {
        tbody.innerHTML += `<tr><td>#${p.id}</td><td>${p.nome}</td><td>${p.especialidade}</td><td>${p.telefone}</td><td><button class="btn-acao btn-edit" onclick="editarUsuario('${p.id}')"><i class="fa-solid fa-pen"></i></button></td></tr>`;
    });
}

async function salvarConsulta(event) {
    event.preventDefault();
    const idConsulta = document.getElementById('cons-id').value;
    const idPaciente = document.getElementById('cons-paciente').value;
    const idProfissional = document.getElementById('cons-profissional').value;
    const data = document.getElementById('cons-data').value;
    const horario = document.getElementById('cons-horario').value;
    let situacao = document.getElementById('cons-situacao').value;
    const observacao = document.getElementById('cons-observacao').value;

    if (!idConsulta) {
        situacao = 'Agendada'; 
    } else if (usuarioLogado && usuarioLogado.perfil === 'paciente') {
        const consultaExistente = consultas.find(c => c.id === idConsulta);
        if (consultaExistente && consultaExistente.situacao !== 'Agendada') return mostrarToast("Pacientes não podem modificar consultas já finalizadas.", "erro");
        situacao = consultaExistente ? consultaExistente.situacao : situacao; 
    }

    // conflito local
    const conflito = consultas.find(c => c.idProfissional === idProfissional && c.data === data && c.horario === horario && c.id !== idConsulta && c.situacao !== 'Cancelada');
    if (conflito) return mostrarToast("Horário já ocupado para este profissional.", "erro");

    const prof = profissionais.find(p => p.id === idProfissional) || {};

    // map especialidade name -> id if available
    let especialidadeId = null;
    const espObj = especialidadesRemotas.find(e => e.nome === prof.especialidade) || especialidadesRemotas.find(e => e.nome === document.getElementById('cons-especialidade').value);
    if (espObj) especialidadeId = espObj.id;

    const payload = {
        pacienteId: Number(idPaciente),
        profissionalId: Number(idProfissional),
        especialidadeId: especialidadeId,
        dataConsulta: data,
        horario: horario,
        situacao: situacao,
        observacao: observacao
    };

    try {
        const res = await fetch(`${API_BASE}/consultas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const txt = await res.text();
            return mostrarToast('Erro ao salvar consulta: ' + txt, 'erro');
        }
        const saved = await res.json();
        // map response to frontend format
        const mapped = { id: saved.id?.toString(), idPaciente: saved.paciente?.id?.toString(), idProfissional: saved.profissional?.id?.toString(), especialidade: saved.especialidade?.nome || '', data: saved.dataConsulta, horario: saved.horario, situacao: saved.situacao, observacao: saved.observacao };
        consultas.push(mapped);
        registrarAuditoria("Novo Agendamento", mapped.id, `Profissional: ${prof.nome || ''}, Data: ${data}`);
        mostrarToast('Consulta agendada!');

        document.getElementById('form-consulta').reset();
        document.getElementById('cons-id').value = "";
        document.getElementById('cons-profissional').disabled = true;
        renderizarConsultas();
    } catch (err) {
        console.error(err);
        mostrarToast('Erro ao conectar com o servidor.', 'erro');
    }
}

function editarConsulta(id) {
    const c = consultas.find(c => c.id === id);
    if(c) {
        document.getElementById('cons-id').value = c.id;
        document.getElementById('cons-paciente').value = c.idPaciente;
        document.getElementById('cons-especialidade').value = c.especialidade;
        
        const evento = new Event('change');
        document.getElementById('cons-especialidade').dispatchEvent(evento);
        
        document.getElementById('cons-profissional').value = c.idProfissional;
        document.getElementById('cons-data').value = c.data;
        document.getElementById('cons-horario').value = c.horario;
        document.getElementById('cons-situacao').value = c.situacao;
        window.scrollTo(0, 0);
    }
}

function cancelarConsulta(id) {
    if(confirm("Cancelar esta consulta?")) {
        let index = consultas.findIndex(c => c.id === id);
        consultas[index].situacao = 'Cancelada';
        registrarAuditoria("Cancelamento de Consulta", id, `Cancelada por ${usuarioLogado.nome}`); 
        atualizarBanco();
        renderizarConsultas();
        mostrarToast("Consulta cancelada.");
    }
}

function editarUsuario(id) {
    const user = usuariosCadastrados.find(u => u.id === id);
    if (!user) return;
    document.getElementById('edit-id').value = user.id;
    document.getElementById('edit-perfil').value = user.perfil;
    document.getElementById('edit-nome').value = user.nome;
    document.getElementById('edit-telefone').value = user.telefone || '';

    const divPac = document.getElementById('edit-campos-paciente');
    const divProf = document.getElementById('edit-campos-profissional');
    divPac.classList.add('oculto');
    divProf.classList.add('oculto');

    if (user.perfil === 'paciente') {
        divPac.classList.remove('oculto');
        document.getElementById('edit-cpf').value = user.cpf || '';
        document.getElementById('edit-nascimento').value = user.nascimento || '';
    } else if (user.perfil === 'profissional') {
        divProf.classList.remove('oculto');
        document.getElementById('edit-especialidade').value = user.especialidade || '';
    }
    document.getElementById('modal-edicao').classList.remove('oculto');
}

function fecharModalEdicao() { document.getElementById('modal-edicao').classList.add('oculto'); }

function salvarEdicaoUsuario(event) {
    event.preventDefault();
    const id = document.getElementById('edit-id').value;
    const perfil = document.getElementById('edit-perfil').value;
    const nascimento = document.getElementById('edit-nascimento').value;
    const index = usuariosCadastrados.findIndex(u => u.id === id);
    
    if (perfil === 'paciente' && nascimento) {
        if (new Date(nascimento) > new Date()) {
            return mostrarToast("A data de nascimento não pode estar no futuro.", "erro");
        }
    }

    usuariosCadastrados[index].nome = document.getElementById('edit-nome').value.trim();
    usuariosCadastrados[index].telefone = document.getElementById('edit-telefone').value;

    if (perfil === 'paciente') {
        usuariosCadastrados[index].cpf = document.getElementById('edit-cpf').value;
        usuariosCadastrados[index].nascimento = nascimento;
    } else if (perfil === 'profissional') {
        usuariosCadastrados[index].especialidade = document.getElementById('edit-especialidade').value;
    }

    registrarAuditoria("Edição de Usuário", id, `Dados atualizados`); 
    atualizarBanco();
    fecharModalEdicao();
    mostrarToast("Cadastro atualizado!");
    if (perfil === 'paciente') renderizarPacientes();
    if (perfil === 'profissional') renderizarProfissionais();
}