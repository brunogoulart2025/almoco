\
document.addEventListener('DOMContentLoaded', () => {
  const select = document.getElementById('funcionario');
  const btnSaida = document.getElementById('btnSaida');
  const btnVolta = document.getElementById('btnVolta');
  const btnExport = document.getElementById('btnExport');
  const btnLimpar = document.getElementById('btnLimpar');
  const tabelaBody = document.querySelector('#tabela tbody');
  const filtroInput = document.getElementById('filtroData');
  const btnFiltrar = document.getElementById('btnFiltrar');
  const btnLimparFiltro = document.getElementById('btnLimparFiltro');

  let registros = JSON.parse(localStorage.getItem('controle_almoco_registros') || '[]');

  // Carrega nomes do arquivo JSON
  fetch('funcionarios.json')
    .then(r => r.json())
    .then(nomes => {
      nomes.forEach(n => {
        const opt = document.createElement('option');
        opt.value = n;
        opt.textContent = n;
        select.appendChild(opt);
      });
    })
    .catch(err => {
      console.error('Erro ao carregar funcionarios.json', err);
    });

  function hojeISO() {
    const d = new Date();
    return d.toISOString().slice(0,10); // YYYY-MM-DD
  }

  function horaAtualHM() {
    const d = new Date();
    return d.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
  }

  function calcularDuracao(saida, volta) {
    // saida/volta em "HH:MM"
    const [hs, ms] = saida.split(':').map(Number);
    const [hv, mv] = volta.split(':').map(Number);
    let inicio = new Date(0,0,0,hs,ms);
    let fim = new Date(0,0,0,hv,mv);
    let diff = (fim - inicio) / 60000; // minutos
    if (diff < 0) diff += 24*60;
    const h = Math.floor(diff/60);
    const m = diff % 60;
    return `${h}h ${m}min`;
  }

  function salvar() {
    localStorage.setItem('controle_almoco_registros', JSON.stringify(registros));
  }

  function atualizarTabela(filterDate='') {
    tabelaBody.innerHTML = '';
    const rows = registros
      .filter(r => !filterDate || r.data === filterDate)
      .sort((a,b) => (b.data + b.nome).localeCompare(a.data + a.nome));
    rows.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${r.nome}</td><td>${r.data}</td><td>${r.saida || '-'}</td><td>${r.volta || '-'}</td><td>${r.duracao || '-'}</td>`;
      tabelaBody.appendChild(tr);
    });
  }

  // Registrar saída
  btnSaida.addEventListener('click', () => {
    const nome = select.value;
    if (!nome) return alert('Selecione um funcionário.');
    const data = hojeISO();
    // verificar se já existe saída para esse nome e data
    const exists = registros.find(r => r.nome === nome && r.data === data);
    if (exists && exists.saida) return alert('Saída já registrada para este funcionário hoje.');
    const hora = horaAtualHM();
    if (exists) {
      exists.saida = hora;
    } else {
      registros.push({ nome, data, saida: hora, volta: null, duracao: null });
    }
    salvar();
    atualizarTabela(filtroInput.value.trim());
    alert(`Saída registrada: ${hora}`);
  });

  // Registrar volta
  btnVolta.addEventListener('click', () => {
    const nome = select.value;
    if (!nome) return alert('Selecione um funcionário.');
    const data = hojeISO();
    const registro = registros.find(r => r.nome === nome && r.data === data);
    if (!registro || !registro.saida) return alert('Não existe registro de saída para este funcionário hoje.');
    if (registro.volta) return alert('Volta já registrada para este funcionário hoje.');
    const hora = horaAtualHM();
    registro.volta = hora;
    registro.duracao = calcularDuracao(registro.saida, registro.volta);
    salvar();
    atualizarTabela(filtroInput.value.trim());
    // verifica se > 1 hora
    const parts = registro.duracao.match(/\d+/g).map(Number);
    const h = parts[0], m = parts[1];
    if (h > 1 || (h === 1 && m > 0)) {
      alert('⚠️ Almoço superior a 1 hora: ' + registro.duracao);
    } else {
      alert('Volta registrada: ' + hora + ' (Duração: ' + registro.duracao + ')');
    }
  });

  // Exportar Excel com duas abas: Registros e Funcionários
  btnExport.addEventListener('click', () => {
    // prepara dados registros
    const wb = XLSX.utils.book_new();
    const regs = [['Nome','Data','Saída','Volta','Duração']];
    registros.forEach(r => regs.push([r.nome, r.data, r.saida || '', r.volta || '', r.duracao || '']));
    const ws1 = XLSX.utils.aoa_to_sheet(regs);
    XLSX.utils.book_append_sheet(wb, ws1, 'Registros');
    // carregar funcionarios.json sincronamente via fetch (já carregado in-memory? But we'll try fetch)
    fetch('funcionarios.json').then(r => r.json()).then(list => {
      const func = [['Nome']].concat(list.map(n => [n]));
      const ws2 = XLSX.utils.aoa_to_sheet(func);
      XLSX.utils.book_append_sheet(wb, ws2, 'Funcionarios');
      XLSX.writeFile(wb, 'Controle_Almoco.xlsx');
    }).catch(err => {
      // fallback: criar sheet vazia se erro
      const ws2 = XLSX.utils.aoa_to_sheet([['Erro ao carregar funcionarios.json']]);
      XLSX.utils.book_append_sheet(wb, ws2, 'Funcionarios');
      XLSX.writeFile(wb, 'Controle_Almoco.xlsx');
    });
  });

  // Limpar registros (com confirmação)
  btnLimpar.addEventListener('click', () => {
    if (!confirm('Tem certeza que deseja apagar todos os registros? Ação irreversível.')) return;
    registros = [];
    salvar();
    atualizarTabela(filtroInput.value.trim());
    alert('Registros apagados.');
  });

  // Filtrar por data
  btnFiltrar.addEventListener('click', () => {
    const v = filtroInput.value.trim();
    if (!v) return alert('Informe uma data no formato YYYY-MM-DD.');
    atualizarTabela(v);
  });
  btnLimparFiltro.addEventListener('click', () => {
    filtroInput.value = '';
    atualizarTabela();
  });

  // inicializa tabela
  atualizarTabela();
});
