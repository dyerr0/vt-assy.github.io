document.addEventListener('DOMContentLoaded', function(){
  document.body.classList.add('fade-in');
  function redirectWithTransition(url){
    document.body.classList.add('fade-out');
    setTimeout(function(){
      window.location.href = url;
    },1000);
  }
  if(!sessionStorage.getItem('linea')){
    redirectToLogin();
    return;
  }
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get('userId') || sessionStorage.getItem('userId');
  const userName = urlParams.get('userName') || sessionStorage.getItem('userName');
  const folio = sessionStorage.getItem('folio');
  const date = urlParams.get('date') || new Date().toLocaleDateString();
  const time = urlParams.get('time') || new Date().toLocaleTimeString();
  const endTime = new Date().getTime();
  sessionStorage.setItem('endTime', endTime);
  const currentPath = window.location.pathname;
  const currentFileName = currentPath.split('/').pop();
  const stepIndex = parseInt(currentFileName.match(/PASO_(\d+)/)[1]);
  const lastCompletedStep = parseInt(sessionStorage.getItem('lastCompletedStep')) || 0;
  if(stepIndex !== lastCompletedStep + 1){
    redirectWithTransition(redirectToLogin());
    return;
  }
  sessionStorage.setItem('lastCompletedStep', stepIndex);
  const startTime = parseInt(sessionStorage.getItem(`startTime_${userId}`));
  const totalTime = Math.floor((endTime - startTime)/1000);
  let hours = Math.floor(totalTime/3600);
  let minutes = Math.floor((totalTime % 3600)/60);
  let seconds = totalTime % 60;
  const formattedTime = hours > 0 ?
    `${hours.toString().padStart(2,'0')}:${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}` :
    `${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`;
  const attempts = JSON.parse(sessionStorage.getItem('attempts'));
  let totalErrors = 0;
  for(const count of Object.values(attempts)){
    if(count > 1){
      totalErrors += (count - 1);
    }
  }
  let resultado;
  if(totalErrors === 0){
    resultado = 'S+';
  }
  else if(totalErrors === 1){
    resultado = 'S';
  }
  else if(totalErrors === 2){
    resultado = 'A+';
  }
  else if(totalErrors === 3){
    resultado = 'A';
  }
  else if(totalErrors === 4){
    resultado = 'A-';
  }
  else if(totalErrors === 5){
    resultado = 'B+';
  }
  else if(totalErrors === 6){
    resultado = 'B';
  }
  else if(totalErrors === 7){
    resultado = 'B-';
  }
  else if(totalErrors === 8){
    resultado = 'C+';
  }
  else if(totalErrors === 9){
    resultado = 'C';
  }
  else if(totalErrors === 10){
    resultado = 'C-';
  }
  else if(totalErrors === 11){
    resultado = 'D+';
  }
  else if(totalErrors === 12){
    resultado = 'D';
  }
  else if(totalErrors === 13){
    resultado = 'D-';
  }
  else{
    resultado = 'F';
  }
  document.getElementById('user-id').textContent = userId;
  document.getElementById('user-name').textContent = userName;
  document.getElementById('folio').textContent = folio;
  document.getElementById('total-time').textContent = formattedTime;
  const resultadoElement = document.getElementById('resultado');
  resultadoElement.textContent = resultado;
  const errorElement = document.createElement('p');
  errorElement.id = 'error-count';
  errorElement.textContent = "Errores: " + totalErrors;
  resultadoElement.parentNode.insertBefore(errorElement, resultadoElement);
  resultadoElement.classList.add('bounce-in');
  document.getElementById('finalize-button').addEventListener('click', function(){
    generateCSV();
    sessionStorage.clear();
    redirectWithTransition(redirectToLogin());
  });
});
function generateCSV(){
  const folio = sessionStorage.getItem('folio');
  const userId = sessionStorage.getItem('userId');
  const userName = sessionStorage.getItem('userName');
  const linea = sessionStorage.getItem('linea');
  const partNumber = sessionStorage.getItem('partNumber');
  const startTime = parseInt(sessionStorage.getItem(`startTime_${userId}`));
  const endTime = parseInt(sessionStorage.getItem('endTime'));
  const totalTime = Math.floor((endTime - startTime)/1000);
  let hours = Math.floor(totalTime/3600);
  let minutes = Math.floor((totalTime % 3600)/60);
  let seconds = totalTime % 60;
  const formattedTime = hours > 0 ?
    `${hours.toString().padStart(2,'0')}:${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}` :
    `${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`;
  let csvContent = "Folio,UserId,UserName,Linea,PartNumber";
  const att = JSON.parse(sessionStorage.getItem('attempts'));
  for(const step of Object.keys(att)){
    csvContent += `,${step}`;
  }
  csvContent += ",TotalTime\n";
  csvContent += `${folio},${userId},${userName},${linea},${partNumber}`;
  for(const count of Object.values(att)){
    csvContent += `,${count}`;
  }
  csvContent += `,${formattedTime}\n`;
  const blob = new Blob([csvContent], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('hidden','');
  a.setAttribute('href', url);
  a.setAttribute('download', `${folio}_evaluation.csv`);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
function redirectToLogin(){
  const currentPath = window.location.pathname;
  const segments = currentPath.split('/');
  const basePath = segments.slice(0,-5).join('/');
  const loginPath = basePath + "/LOGIN.html";
  window.location.href = loginPath;
}
