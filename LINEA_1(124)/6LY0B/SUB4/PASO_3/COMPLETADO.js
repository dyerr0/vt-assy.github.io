document.addEventListener('DOMContentLoaded', function() {
  document.body.classList.add('fade-in');

  // Capturar fecha y hora al cargar la página para el CSV y el flujo
  const loadDate = new Date().toLocaleDateString();
  const loadTime = new Date().toLocaleTimeString();
  sessionStorage.setItem('fechaCSV', loadDate);
  sessionStorage.setItem('horaCSV', loadTime);

  function redirectWithTransition(url) {
    document.body.classList.add('fade-out');
    setTimeout(() => window.location.href = url, 1000);
  }

  // Verificar que haya línea cargada
  if (!sessionStorage.getItem('linea')) {
    redirectToLogin();
    return;
  }

  // Obtener parámetros y registrar endTime
  const urlParams = new URLSearchParams(window.location.search);
  const userId   = urlParams.get('userId')   || sessionStorage.getItem('userId');
  const userName = urlParams.get('userName') || sessionStorage.getItem('userName');
  const folio    = sessionStorage.getItem('folio');
  const endTime  = Date.now();
  sessionStorage.setItem('endTime', endTime);

  // Verificar secuencia de pasos
  const currentFileName = window.location.pathname.split('/').pop();
  const stepIndex       = parseInt(currentFileName.match(/PASO_(\d+)/)[1], 10);
  const lastStep        = parseInt(sessionStorage.getItem('lastCompletedStep'), 10) || 0;
  if (stepIndex !== lastStep + 1) {
    redirectToLogin();
    return;
  }
  sessionStorage.setItem('lastCompletedStep', stepIndex);

  // Calcular tiempo total
  const startTime = parseInt(sessionStorage.getItem(`startTime_${userId}`), 10);
  const totalSec  = Math.floor((endTime - startTime) / 1000);
  const hrs       = Math.floor(totalSec / 3600);
  const mins      = Math.floor((totalSec % 3600) / 60);
  const secs      = totalSec % 60;
  const formattedTime = hrs > 0
    ? `${hrs.toString().padStart(2,'0')}:${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`
    : `${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;

  // Calcular errores y resultado
  const attempts = JSON.parse(sessionStorage.getItem('attempts')) || {};
  let totalErrors = 0;
  Object.values(attempts).forEach(count => { if (count > 1) totalErrors += count - 1; });
  let resultado;
  if      (totalErrors === 0)  resultado = 'S+';
  else if (totalErrors === 1)  resultado = 'S';
  else if (totalErrors === 2)  resultado = 'A+';
  else if (totalErrors === 3)  resultado = 'A';
  else if (totalErrors === 4)  resultado = 'A-';
  else if (totalErrors === 5)  resultado = 'B+';
  else if (totalErrors === 6)  resultado = 'B';
  else if (totalErrors === 7)  resultado = 'B-';
  else if (totalErrors === 8)  resultado = 'C+';
  else if (totalErrors === 9)  resultado = 'C';
  else if (totalErrors === 10) resultado = 'C-';
  else if (totalErrors === 11) resultado = 'D+';
  else if (totalErrors === 12) resultado = 'D';
  else if (totalErrors === 13) resultado = 'D-';
  else                          resultado = 'F';

  // Mostrar en interfaz
  document.getElementById('user-id').textContent    = userId;
  document.getElementById('user-name').textContent  = userName;
  document.getElementById('folio').textContent      = folio;
  document.getElementById('total-time').textContent = formattedTime;
  const resultadoEl = document.getElementById('resultado');
  resultadoEl.textContent = resultado;
  const errorEl = document.createElement('p');
  errorEl.id = 'error-count';
  errorEl.textContent = `Errores: ${totalErrors}`;
  resultadoEl.parentNode.insertBefore(errorEl, resultadoEl);
  resultadoEl.classList.add('bounce-in');

  // Enviar a Power Automate al cargar la página
  sendToPowerAutomate();

  // Al pulsar Finalizar, generar CSV y redirigir
  document.getElementById('finalize-button').addEventListener('click', () => {
    generateCSV();
    sessionStorage.clear();
    redirectToLogin();
  });
});

function generateCSV() {
  // Obtener intentos de sessionStorage
  const attempts = JSON.parse(sessionStorage.getItem('attempts')) || {};

  const fechaCSV   = sessionStorage.getItem('fechaCSV');
  const horaCSV    = sessionStorage.getItem('horaCSV');
  const folio      = sessionStorage.getItem('folio');
  const userId     = sessionStorage.getItem('userId');
  const userName   = sessionStorage.getItem('userName');
  const linea      = sessionStorage.getItem('linea');
  const partNumber = sessionStorage.getItem('partNumber');
  const estacion   = sessionStorage.getItem('estacion');
  const startTime  = parseInt(sessionStorage.getItem(`startTime_${userId}`), 10);
  const endTime    = parseInt(sessionStorage.getItem('endTime'), 10);
  const totalSec   = Math.floor((endTime - startTime) / 1000);
  const hrs        = Math.floor(totalSec / 3600);
  const mins       = Math.floor((totalSec % 3600) / 60);
  const secs       = totalSec % 60;
  const formattedTime = hrs > 0
    ? `${hrs.toString().padStart(2,'0')}:${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`
    : `${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;

  // Configurar cabecera CSV
  let csvContent = 'Fecha,Hora,Folio,UserId,UserName,Linea,PartNumber,Estacion,TotalTime';
  for (let i = 1; i <= 10; i++) csvContent += `,PASO_${i}`;
  csvContent += '\n';

  // Fila de datos CSV
  csvContent += `${fechaCSV},${horaCSV},${folio},${userId},${userName},${linea},${partNumber},${estacion},${formattedTime}`;
  for (let i = 1; i <= 10; i++) {
    const key = `PASO_${i}`;
    const val = attempts[key] != null ? attempts[key] : '';
    csvContent += `,${val}`;
  }
  csvContent += '\n';

  // Descargar archivo
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.hidden   = true;
  a.href     = url;
  a.download = `${folio}_evaluation.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function sendToPowerAutomate() {
  const attempts = JSON.parse(sessionStorage.getItem('attempts')) || {};
  const payload = {
    fecha:      sessionStorage.getItem('fechaCSV'),
    hora:       sessionStorage.getItem('horaCSV'),
    folio:      sessionStorage.getItem('folio'),
    userId:     sessionStorage.getItem('userId'),
    userName:   sessionStorage.getItem('userName'),
    linea:      sessionStorage.getItem('linea'),
    partNumber: sessionStorage.getItem('partNumber'),
    estacion:   sessionStorage.getItem('estacion'),
    totalTime:  document.getElementById('total-time').textContent
  };
  for (let i = 1; i <= 10; i++) {
    const key = `PASO_${i}`;
    payload[key] = attempts[key] != null ? attempts[key].toString() : '';
  }

  fetch(
    'https://prod-62.japaneast.logic.azure.com:443/workflows/2cf8a8a35c1e437ba741d6eb00483a2d/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=9LnciLruSLTaT2eL8_hiBdiLjGZFn53GYDv2ZhVPhT8',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }
  )
    .then(res => {
      if (!res.ok) return res.text().then(text => console.error('HTTP Error:', res.status, text));
      return res.json().then(data => console.log('Respuesta de Power Automate:', data));
    })
    .catch(err => console.error('Error en fetch:', err));
}

function redirectToLogin() {
  const segments = window.location.pathname.split('/');
  const basePath = segments.slice(0, -5).join('/');
  window.location.href = basePath + '/LOGIN.html';
}
