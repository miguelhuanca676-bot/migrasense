/* ===================================================================
   MigraSense — registro.js
   Maneja las dos pestañas de registro: síntomas prodrómicos y
   episodio de migraña completo. Guarda los registros en el servidor
   (POST /api/registros/prodromico y /api/registros/episodio).
   =================================================================== */

msAlCargar(() => {
  if (!MS.requireAuth()) return;

  /* ---------- Tabs ---------- */
  const tabBtns = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-panel');
  function setTab(name) {
    tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    panels.forEach(p => p.classList.toggle('active', p.id === `panel-${name}`));
  }
  tabBtns.forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));

  const urlTab = new URLSearchParams(window.location.search).get('tab');
  if (urlTab === 'episodio') setTab('episodio');

  /* ---------- Fecha/hora actual por defecto en episodio ---------- */
  const epFecha = document.getElementById('epFecha');
  const epHoraInicio = document.getElementById('epHoraInicio');
  const epHoraFin = document.getElementById('epHoraFin');
  const ahoraLocal = new Date();
  const pad = n => String(n).padStart(2, '0');
  epFecha.value = `${ahoraLocal.getFullYear()}-${pad(ahoraLocal.getMonth()+1)}-${pad(ahoraLocal.getDate())}`;
  function tiemposEpisodio() {
    if (!epFecha.value || !epHoraInicio.value || !epHoraFin.value) return null;
    const inicio = new Date(`${epFecha.value}T${epHoraInicio.value}:00`);
    const fin = new Date(`${epFecha.value}T${epHoraFin.value}:00`);
    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) return null;
    if (fin < inicio) fin.setDate(fin.getDate()+1);
    const minutos = Math.round((fin-inicio)/60000);
    return {inicio,fin,minutos};
  }
  function actualizarDuracion() {
    const t = tiemposEpisodio();
    document.getElementById('epDuracionExacta').textContent = t && t.minutos > 0
      ? `Duración exacta: ${Math.floor(t.minutos/1440)} día(s), ${Math.floor(t.minutos%1440/60)} hora(s) y ${t.minutos%60} minuto(s).`
      : 'Completa una hora de inicio y fin diferentes para calcular la duración.';
  }
  [epFecha,epHoraInicio,epHoraFin].forEach(el=>el.addEventListener('change',actualizarDuracion));

  /* ---------- Helpers de selección tipo chip / option-card ----------
     Escuchamos 'change' en el <input>, no 'click' en el <label>: un
     <label> que envuelve un <input> reenvía un click sintético al
     input, que vuelve a burbujear por el label. Si el handler estuviera
     en 'click', se ejecutaría dos veces por cada toque y la selección
     se deshacía sola (el bug de "no deja elegir"). */
  function bindSingle(container) {
    container.querySelectorAll('.chip, .option-card').forEach(el => {
      const input = el.querySelector('input');
      if (!input) return;
      input.addEventListener('change', () => {
        container.querySelectorAll('.chip, .option-card').forEach(o => o.classList.remove('selected'));
        el.classList.add('selected');
      });
    });
  }
  function bindMulti(container) {
    container.querySelectorAll('.chip, .option-card').forEach(el => {
      const input = el.querySelector('input');
      if (!input) return;
      input.addEventListener('change', () => {
        el.classList.toggle('selected', input.checked);
      });
    });
  }
  function getSingleValue(container) {
    const sel = container.querySelector('.chip.selected, .option-card.selected');
    return sel ? sel.dataset.value : null;
  }
  function getMultiValues(container) {
    return Array.from(container.querySelectorAll('.chip.selected, .option-card.selected')).map(el => el.dataset.value);
  }
  function getMultiLabels(container) {
    return Array.from(container.querySelectorAll('.chip.selected, .option-card.selected')).map(el => el.textContent.trim());
  }

  /* ---------- Síntomas prodrómicos (pestaña 1): SOLO UNO, con "Más información" ---------- */
  const prodromicoChecklist = document.getElementById('prodromicoChecklist');
  MS_PRODROMICOS.forEach((p, i) => {
    const item = document.createElement('div');
    item.className = 'sym-item';
    item.innerHTML = `
      <label class="option-card" data-value="${p.id}">
        <input type="radio" name="prodsintoma">
        <span class="oc-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/></svg></span>
        <span class="oc-text">${p.label}</span>
        <span class="oc-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 12l5 5L20 7"/></svg></span>
      </label>
      <button type="button" class="sym-more" aria-expanded="false" aria-controls="symInfo${i}">
        Más información
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M6 9l6 6 6-6"/></svg>
      </button>
      <div class="sym-info" id="symInfo${i}" hidden>${p.info}</div>`;
    prodromicoChecklist.appendChild(item);
  });
  bindSingle(prodromicoChecklist);
  prodromicoChecklist.addEventListener('click', (e) => {
    const btn = e.target.closest('.sym-more');
    if (!btn) return;
    const panel = document.getElementById(btn.getAttribute('aria-controls'));
    const open = panel.hidden;
    panel.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    btn.closest('.sym-item').classList.toggle('open', open);
  });

  /* ---------- Hora de aparición: "Ahora mismo" u otra hora ---------- */
  const prodHoraModo = document.getElementById('prodHoraModo');
  const prodHoraWrap = document.getElementById('prodHoraWrap');
  const prodHora = document.getElementById('prodHora');
  const hhmm = d => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  prodHora.value = hhmm(new Date());
  bindSingle(prodHoraModo);
  prodHoraModo.addEventListener('change', () => {
    const modo = getSingleValue(prodHoraModo);
    prodHoraWrap.style.display = modo === 'otra' ? '' : 'none';
    if (modo === 'otra') { prodHora.value = hhmm(new Date()); prodHora.focus(); }
  });

  /* ---------- Construir grid de síntomas (pestaña 2, versión compacta) ---------- */
  const epSintomas = document.getElementById('epSintomas');
  [{id:'ninguno',label:'Ningún síntoma'},{id:'auras',label:'Auras'}, ...MS_PRODROMICOS].forEach(p => {
    const label = document.createElement('label');
    label.className = 'chip';
    label.dataset.value = p.id;
    label.innerHTML = `<input type="checkbox">${p.label}`;
    epSintomas.appendChild(label);
  });
  bindMulti(epSintomas);
  epSintomas.addEventListener('change', e => {
    const input = e.target;
    if (!input.matches('input')) return;
    const ninguno = epSintomas.querySelector('[data-value="ninguno"] input');
    if (input === ninguno && input.checked) {
      epSintomas.querySelectorAll('input').forEach(other => { if(other !== ninguno){other.checked=false;other.closest('.chip').classList.remove('selected');} });
    } else if (input !== ninguno && input.checked) {
      ninguno.checked=false;ninguno.closest('.chip').classList.remove('selected');
    }
  });

  /* ---------- Construir grid de disparadores (pestaña 2) ---------- */
  const epDisparadores = document.getElementById('epDisparadores');
  MS_TRIGGERS.forEach(t => {
    const label = document.createElement('label');
    label.className = 'chip';
    label.dataset.value = t.id;
    label.innerHTML = `<input type="checkbox">${t.label}`;
    epDisparadores.appendChild(label);
  });
  bindMulti(epDisparadores);


  bindSingle(document.getElementById('epMedicacion'));

  /* ---------- Mostrar/ocultar nombre del medicamento ---------- */
  const epMedNombreWrap = document.getElementById('epMedNombreWrap');
  document.getElementById('epMedicacion').addEventListener('change', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    epMedNombreWrap.style.display = chip.dataset.value === 'si' ? '' : 'none';
  });

  /* ---------- Sliders con leyenda ---------- */
  function bindScale(inputId, valueId, captionId) {
    const input = document.getElementById(inputId);
    const value = document.getElementById(valueId);
    const caption = document.getElementById(captionId);
    const captionFor = v => v <= 3 ? 'Leve' : v <= 6 ? 'Moderado' : v <= 8 ? 'Intenso' : 'Incapacitante';
    input.addEventListener('input', () => {
      value.textContent = input.value;
      caption.textContent = captionFor(Number(input.value));
    });
  }
  bindScale('prodIntensidad', 'prodValue', 'prodCaption');
  bindScale('epIntensidad', 'epValue', 'epCaption');

  /* ---------- Guardar: síntoma prodrómico (uno solo, con hora de aparición) ---------- */
  document.getElementById('saveProdromico').addEventListener('click', () => {
    const sel = prodromicoChecklist.querySelector('.option-card.selected');
    if (!sel) {
      msToast('Selecciona el síntoma que notas', '⚠️');
      return;
    }

    const ahora = new Date();
    let aparicion = ahora;
    if (getSingleValue(prodHoraModo) === 'otra') {
      if (!/^\d{2}:\d{2}$/.test(prodHora.value)) { msToast('Indica la hora de aparición', '⚠️'); return; }
      const [h, m] = prodHora.value.split(':').map(Number);
      aparicion = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), h, m, 0, 0);
      if (aparicion > ahora) aparicion.setDate(aparicion.getDate() - 1);   // hora futura = fue ayer
    }

    guardar(document.getElementById('saveProdromico'), 'prodromico', {
      sintomas: [sel.dataset.value],
      intensidad: Number(document.getElementById('prodIntensidad').value),
      notas: document.getElementById('prodNotas').value.trim(),
      inicio: aparicion.toISOString()             // hora de aparición del síntoma
    }, 'Registro guardado con éxito');
  });

  /* Envía el registro al servidor; si falla, el formulario queda tal cual para reintentar */
  function guardar(btn, tipo, datos, mensaje) {
    if (btn.getAttribute('aria-busy') === 'true') return;
    const texto = btn.textContent;
    btn.setAttribute('aria-busy', 'true'); btn.textContent = 'Guardando…';
    MSApi.crearRegistro(tipo, datos)
      .then(() => {
        msToast(mensaje, '📝');
        setTimeout(() => { window.location.href = 'historial.html'; }, 700);
      })
      .catch(err => {
        btn.removeAttribute('aria-busy'); btn.textContent = texto;
        msToast(err.message, '⚠️');
      });
  }

  /* ---------- Guardar: episodio completo ---------- */
  document.getElementById('saveEpisodio').addEventListener('click', () => {
    const t = tiemposEpisodio();
    if (!t || t.minutos <= 0) { msToast('Indica una fecha y horas válidas, con duración mayor a cero', '⚠️'); return; }
    if (t.inicio.getTime() > Date.now() || t.fin.getTime() > Date.now()) { msToast('El episodio no puede comenzar ni terminar en el futuro', '⚠️'); return; }
    const inicio = t.inicio;
    const duracion = t.minutos < 240 ? 'menos_4h' : t.minutos <= 1440 ? '4_24h' : t.minutos <= 4320 ? '1_3d' : 'mas_3d';
    const medicacion = getSingleValue(document.getElementById('epMedicacion')) === 'si';
    guardar(document.getElementById('saveEpisodio'), 'episodio', {
      intensidad: Number(document.getElementById('epIntensidad').value),
      duracion,
      fin: t.fin.toISOString(),
      duracionMinutos: t.minutos,
      inicio: inicio.toISOString(),
      sintomas: getMultiValues(epSintomas),          // se envían los códigos (luz, cervical…)
      disparadores: getMultiValues(epDisparadores),
      medicacion,
      medicamento: medicacion ? document.getElementById('epMedNombre').value.trim() : '',
      notas: document.getElementById('epNotas').value.trim()
    }, 'Episodio registrado');
  });
});
