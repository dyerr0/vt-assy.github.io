const devMode =false;
const timeLimit = 180;

let lockPosition = {
    "top": null,
    "left": null
};

let currentCavidades = Object.keys(cavityPositions).length;
let currentOrientationCount = Object.keys(orientationPositions).length;
let userConnections = [];
let selectedCable = null;
let countdown;
let timeLeft = timeLimit;
let userId = sessionStorage.getItem('userId');

const segments = window.location.pathname.split('/').filter(seg => seg !== "");
const urlLinea = segments[segments.length - 5];
const urlPartNumber = segments[segments.length - 4] + " " + segments[segments.length - 3].split('.')[0];

window.onload = function () {
    let linea, partNumber, estacion;
    if (!devMode) {
        if (!sessionStorage.getItem('linea') || 
            !sessionStorage.getItem('partNumber') || 
            !sessionStorage.getItem('estacion')) {
            redirectToLogin();
            return;
        }
        linea = sessionStorage.getItem('linea');
        partNumber = sessionStorage.getItem('partNumber');
        estacion = sessionStorage.getItem('estacion');
    let nuevoPartNumber = partNumber + " - " + estacion;
    
    document.getElementById('page-heading').textContent = linea + " - " + nuevoPartNumber;
    } else {
        linea = urlLinea;
        partNumber = urlPartNumber;
        document.getElementById('page-heading').textContent = linea + " - " + partNumber;
    }
    
    const currentPath = window.location.pathname;
    const currentFileName = currentPath.split('/').pop();
    const stepIndex = parseInt(currentFileName.match(/PASO_(\d+)/)[1]);

    if (!devMode) {
        const lastCompletedStep = parseInt(sessionStorage.getItem('lastCompletedStep')) || 0;
        if (stepIndex !== lastCompletedStep + 1) {
            redirectToLogin();
            return;
        }
    }

    if (!devMode) {
        if (stepIndex === 1) {
            if (sessionStorage.getItem(`evaluationStarted_${userId}`) === 'true') {
                redirectToLogin();
            } else {
                const modal = document.getElementById('confirmation-modal');
                modal.style.display = 'block';
                document.getElementById('confirm-start').addEventListener('click', function () {
                    sessionStorage.setItem(`evaluationStarted_${userId}`, 'true');
                    const startTime = new Date().getTime();
                    sessionStorage.setItem(`startTime_${userId}`, startTime);
                    modal.style.display = 'none';
                    startTimer();
                    sessionStorage.setItem('lastCompletedStep', 1);
                });
                document.getElementById('cancel-start').addEventListener('click', function () {
                    redirectToLogin();
                });
            }
        } else {
            startTimer();
        }
    } else {
        document.getElementById('timer').textContent = "∞";
    }
    document.body.classList.add('fade-in');
    if (devMode) createDevMenu();
    renderCavidades();
    renderOrientacion();
    renderLock();
};

function startTimer() {
    if (devMode) return;
    const timerDisplay = document.getElementById('timer');
    countdown = setInterval(function () {
        const startTime = parseInt(sessionStorage.getItem(`startTime_${userId}`));
        const currentTime = new Date().getTime();
        const elapsedTime = Math.floor((currentTime - startTime) / 1000);
        timeLeft = timeLimit - elapsedTime;
        if (timeLeft <= 0) {
            clearInterval(countdown);
            showTimeoutModal();
        } else {
            let minutes = Math.floor(timeLeft / 60);
            let seconds = timeLeft % 60;
            timerDisplay.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        }
    }, 1000);
}

function showTimeoutModal() {
    const timeoutModal = document.getElementById('timeout-modal');
    timeoutModal.style.display = 'block';
    document.getElementById('exit-evaluation').addEventListener('click', function () {
        redirectToLogin();
    });
}

function redirectToLogin() {
    const currentPath = window.location.pathname;
    const pathSegments = currentPath.split('/');
    const loginPath = pathSegments.slice(0, -5).join('/') + '/LOGIN.html';
    window.location.href = loginPath;
}

function selectCable(event) {
    if (event.target.tagName === 'circle') {
        if (selectedCable) {
            if (selectedCable.circle === event.target) {
                resetSelectedCable();
                return;
            } else {
                resetSelectedCable();
            }
        }
        const cableItem = event.target.parentNode.parentNode;
        const delimiter = document.createElement('div');
        delimiter.className = 'cable-delimiter';
        cableItem.appendChild(delimiter);
        const cableType = event.target.parentNode.dataset.id;
        selectedCable = {
            element: event.target.parentNode,
            circle: event.target,
            originalColor: event.target.getAttribute("fill"),
            delimiter: delimiter,
            isDummy: cableType === 'DMY'
        };
        const overlayLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        overlayLine.setAttribute("stroke", selectedCable.isDummy ? "black" : selectedCable.originalColor);
        overlayLine.setAttribute("stroke-width", "4");
        if (selectedCable.isDummy) {
            overlayLine.setAttribute("stroke-dasharray", "4");
        }
        const overlay = document.getElementById("cable-overlay");
        overlay.appendChild(overlayLine);
        selectedCable.overlayLine = overlayLine;
        document.addEventListener("mousemove", moveCable);
    }
}

function moveCable(event) {
    if (!selectedCable) return;
    const cableRect = selectedCable.circle.getBoundingClientRect();
    const x1 = cableRect.left + cableRect.width / 2 + window.scrollX;
    const y1 = cableRect.top + cableRect.height / 2 + window.scrollY;
    const x2 = event.clientX + window.scrollX;
    const y2 = event.clientY + window.scrollY;
    selectedCable.overlayLine.setAttribute("x1", x1);
    selectedCable.overlayLine.setAttribute("y1", y1);
    selectedCable.overlayLine.setAttribute("x2", x2);
    selectedCable.overlayLine.setAttribute("y2", y2);
}

document.addEventListener('DOMContentLoaded', function () {
    document.body.classList.add('fade-in');
    const pathSegments = window.location.pathname.split('/');
    const stepFolder = pathSegments[pathSegments.length - 2];
    const stepName = stepFolder.replace('_', ' ');
    const stepElement = document.getElementById('step');
    stepElement.textContent = stepName.charAt(0).toUpperCase() + stepName.slice(1);
});

function renderCavidades() {
    const connector = document.querySelector('.connector');
    let cavitiesContainer = connector.querySelector('.cavities-container');
    if (!cavitiesContainer) {
        cavitiesContainer = document.createElement('div');
        cavitiesContainer.className = 'cavities-container';
        connector.appendChild(cavitiesContainer);
    }
    cavitiesContainer.innerHTML = "";
    let numCav = currentCavidades;
    const fixedCavitiesPerRow = Math.ceil(numCav / 2);
    for (let i = 1; i <= numCav; i++) {
        let pos;
        if (cavityPositions["cavity(" + i + ")"]) {
            pos = cavityPositions["cavity(" + i + ")"];
        } else {
            let rowIndex = Math.floor((i - 1) / fixedCavitiesPerRow);
            let colIndex = (i - 1) % fixedCavitiesPerRow;
            const topOffset = 160 - rowIndex * 45;
            const leftOffset = 60 + colIndex * 35;
            pos = { top: topOffset, left: leftOffset };
            cavityPositions["cavity(" + i + ")"] = pos;
        }
        const cavity = document.createElement('div');
        cavity.className = 'cavity';
        cavity.dataset.id = i;
        cavity.textContent = i;
        cavity.style.position = 'absolute';
        cavity.style.width = cavidadWidth;
        cavity.style.height = cavidadHeight;
        cavity.style.borderRadius = angularShape ? "0" : "50%";
        cavity.style.top = pos.top + "px";
        cavity.style.left = pos.left + "px";
        cavity.onclick = handleCavityClick;
        cavitiesContainer.appendChild(cavity);
        if (devMode) {
            makeDraggable(cavity);
        }
    }
}

function renderOrientacion() {
    const connector = document.querySelector('.connector');
    let orientationContainer = connector.querySelector('.orientation-container');
    if (!orientationContainer) {
        orientationContainer = document.createElement('div');
        orientationContainer.className = 'orientation-container';
        connector.appendChild(orientationContainer);
    }
    orientationContainer.innerHTML = "";
    let numOri = currentOrientationCount;
    for (let i = 1; i <= numOri; i++) {
        (function (index) {
            const orientImg = document.createElement('img');
            orientImg.src = "../../../../ORIENT.png";
            orientImg.id = "orientation(" + index + ")";
            orientImg.classList.add("orientation-object");

            orientImg.dataset.angle = 0;
            orientImg.dataset.orientation = "right";
            orientImg.style.cursor = "pointer";
            orientImg.style.height = orientationHeight;
            orientImg.style.position = "absolute";

            if (orientationPositions && orientationPositions["orientation(" + index + ")"]) {
                orientImg.style.top = orientationPositions["orientation(" + index + ")"].top + "px";
                orientImg.style.left = orientationPositions["orientation(" + index + ")"].left + "px";
            } else {
                orientImg.style.top = "0px";
                orientImg.style.left = ((index - 1) * 20) + "px";
                orientationPositions["orientation(" + index + ")"] = { top: 0, left: (index - 1) * 20 };
            }
            orientImg.style.transform = "rotate(0deg)";
            orientImg.addEventListener('click', function () {
                let angle = parseInt(orientImg.dataset.angle);
                angle = (angle + 90) % 360;
                orientImg.dataset.angle = angle;
                let orientation = "";
                switch (angle) {
                    case 0: orientation = "right"; break;
                    case 90: orientation = "down"; break;
                    case 180: orientation = "left"; break;
                    case 270: orientation = "up"; break;
                    default: orientation = "right";
                }
                orientImg.dataset.orientation = orientation;
                orientImg.style.transform = "rotate(" + angle + "deg)";
            });
            orientationContainer.appendChild(orientImg);
            if (devMode) {
                makeDraggable(orientImg);
            }
        })(i);
    }
}

function renderLock() {
    const connector = document.querySelector('.connector');
    let lockContainer = connector.querySelector('.lock-container');
    if (!lockContainer) {
        lockContainer = document.createElement('div');
        lockContainer.className = 'lock-container';
        connector.appendChild(lockContainer);
    }
    lockContainer.innerHTML = "";
    const lockElement = document.createElement('img');
    lockElement.src = "../../../../OPEN.png";
    lockElement.id = "lock-element";
    lockElement.classList.add("lock-object");
    lockElement.dataset.state = "open";
    lockElement.style.cursor = "pointer";
    if (lockPosition) {
        lockElement.style.position = "absolute";
        lockElement.style.top = lockPosition.top + "px";
        lockElement.style.left = lockPosition.left + "px";
    }
    lockElement.addEventListener('click', function () {
        if (lockElement.dataset.state === "open") {
            lockElement.dataset.state = "locked";
            lockElement.src = "../../../../LOCK.png";
        } else {
            lockElement.dataset.state = "open";
            lockElement.src = "../../../../OPEN.png";
        }
    });
    lockContainer.appendChild(lockElement);
    if (devMode) {
        makeDraggable(lockElement);
    }
}

function handleCavityClick(event) {
    const cavityId = event.target.dataset.id;
    let existing = userConnections.find(conn => conn.cavityId === cavityId);
    if (existing) {
        removeCable(event);
    } else {
        placeCable(event);
    }
}

function placeCable(event) {
    if (!selectedCable || !event.target.classList.contains('cavity')) return;
    const cavityRect = event.target.getBoundingClientRect();
    const x2 = cavityRect.left + cavityRect.width / 2 + window.scrollX;
    const y2 = cavityRect.top + cavityRect.height / 2 + window.scrollY;
    const cableRect = selectedCable.circle.getBoundingClientRect();
    const x1 = cableRect.left + cableRect.width / 2 + window.scrollX;
    const y1 = cableRect.top + cableRect.height / 2 + window.scrollY;
    selectedCable.overlayLine.setAttribute("x2", x2);
    selectedCable.overlayLine.setAttribute("y2", y2);
    const cavityCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    cavityCircle.setAttribute("cx", x2);
    cavityCircle.setAttribute("cy", y2);
    cavityCircle.setAttribute("r", "10");
    if (selectedCable.isDummy) {
        cavityCircle.setAttribute("fill", "transparent");
        cavityCircle.setAttribute("stroke", "black");
        cavityCircle.setAttribute("stroke-dasharray", "4");
    } else {
        cavityCircle.setAttribute("fill", selectedCable.originalColor);
    }
    const overlay = document.getElementById("cable-overlay");
    overlay.appendChild(cavityCircle);
    selectedCable.delimiter.remove();
    userConnections.push({
        cableId: selectedCable.element.dataset.id,
        cavityId: event.target.dataset.id,
        overlayLine: selectedCable.overlayLine,
        cableCircle: selectedCable.circle,
        cavityElement: event.target,
        cavityCircle: cavityCircle
    });
    selectedCable = null;
    document.removeEventListener("mousemove", moveCable);
    updateLines();
}

function resetSelectedCable() {
    if (selectedCable) {
        if (selectedCable.overlayLine) {
            selectedCable.overlayLine.remove();
        }
        if (selectedCable.delimiter) {
            selectedCable.delimiter.remove();
        }
    }
    document.removeEventListener("mousemove", moveCable);
    selectedCable = null;
}

function removeCable(event) {
    const cavityId = event.target.dataset.id;
    const index = userConnections.findIndex(conn => conn.cavityId === cavityId);
    if (index !== -1) {
        let conn = userConnections[index];
        if (conn.overlayLine && conn.overlayLine.remove) {
            conn.overlayLine.remove();
        }
        if (conn.cavityCircle && conn.cavityCircle.remove) {
            conn.cavityCircle.remove();
        }
        userConnections.splice(index, 1);
    }
}

function updateLines() {
    userConnections.forEach(connection => {
        if (!connection.cableCircle || !connection.cavityElement) return;
        const cableRect = connection.cableCircle.getBoundingClientRect();
        const cavityRect = connection.cavityElement.getBoundingClientRect();
        const x1 = cableRect.left + cableRect.width / 2 + window.scrollX;
        const y1 = cableRect.top + cableRect.height / 2 + window.scrollY;
        const x2 = cavityRect.left + cavityRect.width / 2 + window.scrollX;
        const y2 = cavityRect.top + cavityRect.height / 2 + window.scrollY;
        connection.overlayLine.setAttribute("x1", x1);
        connection.overlayLine.setAttribute("y1", y1);
        connection.overlayLine.setAttribute("x2", x2);
        connection.overlayLine.setAttribute("y2", y2);
        connection.cavityCircle.setAttribute("cx", x2);
        connection.cavityCircle.setAttribute("cy", y2);
    });
}

window.addEventListener('resize', updateLines);
window.addEventListener('scroll', updateLines);

function evaluateConnections() {
    const currentFileName = window.location.pathname.split('/').pop();
    const stepIndex = parseInt(currentFileName.match(/PASO_(\d+)/)[1]);
    let attempts = JSON.parse(sessionStorage.getItem('attempts')) || {};
    const currentStep = `PASO_${stepIndex}`;
    if (!attempts[currentStep]) attempts[currentStep] = 0;
    attempts[currentStep] += 1;
    sessionStorage.setItem('attempts', JSON.stringify(attempts));

    let connCorrect = true;
    if (connections) {
        const expectedCount = Object.keys(connections).length;
        connCorrect = (userConnections.length === expectedCount);
        if (connCorrect) {
            connections.forEach(expected => {
                let found = userConnections.find(userConn =>
                    userConn.cavityId === expected.cavityId && userConn.cableId === expected.cableId
                );
                if (!found) connCorrect = false;
            });
        }
    }

    let oriCorrect = true;
    if (orientationConfigs) {
        const orientationElements = document.querySelectorAll('.orientation-object');
        orientationElements.forEach((img, index) => {
            const exp = orientationConfigs["orientation(" + (index + 1) + ")"];
            if (img.dataset.orientation !== exp) {
                oriCorrect = false;
            }
        });
    }

    let lockCorrect = true;
    if (lockExpected) {
        const lockElement = document.getElementById('lock-element');
        if (lockElement.dataset.state !== lockExpected) {
            lockCorrect = false;
        }
    }

    const resultElement = document.getElementById("result");
    if (connCorrect && oriCorrect && lockCorrect) {
        resultElement.textContent = "¡Conexion, orientacion y candado correctos!";
        resultElement.style.color = "green";
        showNextStepButton();
    } else {
        let errorMessage = "";
        if (!connCorrect && !oriCorrect && !lockCorrect) {
            errorMessage = "Conexion, orientacion y candado incorrectos";
        } else if (!connCorrect) {
            errorMessage = "Conexion incorrecta";
        } else if (!oriCorrect) {
            errorMessage = "Orientacion incorrecta";
        } else if (!lockCorrect) {
            errorMessage = "Candado incorrecto";
        }
        resultElement.textContent = errorMessage;
        resultElement.style.color = "red";
    }
}

function showNextStepButton() {
    const nextButton = document.getElementById('next-step-button');
    nextButton.style.display = 'inline-block';
    nextButton.onclick = function () {
        const pathSegments = window.location.pathname.split('/');
        const currentFileName = pathSegments[pathSegments.length - 1];
        const stepIndex = parseInt(currentFileName.match(/PASO_(\d+)/)[1]);
        const nextStepIndex = stepIndex + 1;
        sessionStorage.setItem('lastCompletedStep', stepIndex);
        const nextStepFileName = currentFileName.replace(`PASO_${stepIndex}`, `PASO_${nextStepIndex}`);
        const currentPartFolder = pathSegments.slice(0, -2).join('/');
        const nextStepFolder = `PASO_${nextStepIndex}`;
        const fullNextStepPath = `${currentPartFolder}/${nextStepFolder}/${nextStepFileName}`;
        window.location.href = fullNextStepPath;
    };
}

function makeDraggable(el) {
    if (!devMode) return;
    let offsetX = 0, offsetY = 0;
    el.addEventListener('mousedown', function (e) {
        e.preventDefault();
        offsetX = e.clientX - el.getBoundingClientRect().left;
        offsetY = e.clientY - el.getBoundingClientRect().top;
        function mouseMoveHandler(e) {
            const parentRect = el.parentNode.getBoundingClientRect();
            let newLeft = e.clientX - offsetX - parentRect.left;
            let newTop = e.clientY - offsetY - parentRect.top;
            el.style.left = newLeft + "px";
            el.style.top = newTop + "px";
        }
        function mouseUpHandler(e) {
            window.removeEventListener('mousemove', mouseMoveHandler);
            window.removeEventListener('mouseup', mouseUpHandler);
            if (el.classList.contains("cavity") && el.dataset.id) {
                let index = parseInt(el.dataset.id) - 1;
                cavityPositions["cavity(" + (index + 1) + ")"] = { top: parseFloat(el.style.top), left: parseFloat(el.style.left) };
            } else if (el.classList.contains("orientation-object") && el.id) {
                let parts = el.id.split("-");
                let index = parseInt(parts[1]) - 1;
                orientationPositions["orientation(" + (index + 1) + ")"] = { top: parseFloat(el.style.top || 0), left: parseFloat(el.style.left || 0) };
            } else if (el.classList.contains("lock-object")) {
                lockPosition = { top: parseFloat(el.style.top), left: parseFloat(el.style.left) };
            }
        }
        window.addEventListener('mousemove', mouseMoveHandler);
        window.addEventListener('mouseup', mouseUpHandler);
    });
}

function createDevMenu() {
    const devMenu = document.createElement('div');
    devMenu.id = "dev-menu";
    devMenu.style.position = "fixed";
    devMenu.style.top = "0";
    devMenu.style.left = "0";
    devMenu.style.right = "0";
    devMenu.style.backgroundColor = "#333";
    devMenu.style.color = "#fff";
    devMenu.style.padding = "5px";
    devMenu.style.zIndex = "2000";

    const cavSection = document.createElement('div');
    cavSection.style.display = "inline-block";
    cavSection.style.marginRight = "20px";
    cavSection.innerHTML = "<strong>Cavidades:</strong> ";

    const addCavBtn = document.createElement('button');
    addCavBtn.textContent = "+";
    addCavBtn.onclick = function () {
        currentCavidades = (typeof currentCavidades !== "undefined") ? currentCavidades + 1 : Object.keys(cavityPositions).length + 1;
        renderCavidades();
    };
    cavSection.appendChild(addCavBtn);

    const removeCavBtn = document.createElement('button');
    removeCavBtn.textContent = "-";
    removeCavBtn.onclick = function () {
        if ((typeof currentCavidades !== "undefined") ? currentCavidades > 1 : Object.keys(cavityPositions).length > 1) {
            currentCavidades = currentCavidades - 1;
            renderCavidades();
        }
    };
    cavSection.appendChild(removeCavBtn);

    const sizeLabel = document.createElement('label');
    sizeLabel.textContent = " Tamaño (W x H): ";
    cavSection.appendChild(sizeLabel);

    const widthInput = document.createElement('input');
    widthInput.type = "number";
    widthInput.value = cavidadWidth ? parseInt(cavidadWidth) : "";
    widthInput.style.width = "50px";
    widthInput.addEventListener('input', function () {
        cavidadWidth = widthInput.value + "px";
        if (sameSizeCheckbox.checked) {
            cavidadHeight = cavidadWidth;
            heightInput.value = widthInput.value;
        }
        renderCavidades();
    });
    cavSection.appendChild(widthInput);

    const heightInput = document.createElement('input');
    heightInput.type = "number";
    heightInput.value = cavidadHeight ? parseInt(cavidadHeight) : "";
    heightInput.style.width = "50px";
    heightInput.addEventListener('input', function () {
        if (!sameSizeCheckbox.checked) {
            cavidadHeight = heightInput.value + "px";
            renderCavidades();
        }
    });
    cavSection.appendChild(heightInput);

    const sameSizeCheckbox = document.createElement('input');
    sameSizeCheckbox.type = "checkbox";
    sameSizeCheckbox.checked = true;
    sameSizeCheckbox.addEventListener('change', function () {
        if (sameSizeCheckbox.checked) {
            cavidadHeight = cavidadWidth;
            heightInput.value = cavidadWidth ? parseInt(cavidadWidth) : "";
            renderCavidades();
        }
    });
    cavSection.appendChild(sameSizeCheckbox);
    const sameSizeLabel = document.createElement('label');
    sameSizeLabel.textContent = " Igual";
    cavSection.appendChild(sameSizeLabel);

    const angularCheckbox = document.createElement('input');
    angularCheckbox.type = "checkbox";
    angularCheckbox.checked = angularShape || false;
    angularCheckbox.addEventListener('change', function () {
        angularShape = angularCheckbox.checked;
        renderCavidades();
    });
    cavSection.appendChild(angularCheckbox);
    const angularLabel = document.createElement('label');
    angularLabel.textContent = " Angular";
    cavSection.appendChild(angularLabel);

    devMenu.appendChild(cavSection);

    const oriSection = document.createElement('div');
    oriSection.style.display = "inline-block";
    oriSection.innerHTML = "<strong>Orientación:</strong> ";

    const addOriBtn = document.createElement('button');
    addOriBtn.textContent = "+";
    addOriBtn.onclick = function () {
        currentOrientationCount = (typeof currentOrientationCount !== "undefined") ? currentOrientationCount + 1 : Object.keys(orientationPositions).length + 1;
        renderOrientacion();
    };
    oriSection.appendChild(addOriBtn);

    const removeOriBtn = document.createElement('button');
    removeOriBtn.textContent = "-";
    removeOriBtn.onclick = function () {
        if ((typeof currentOrientationCount !== "undefined") ? currentOrientationCount > 1 : Object.keys(orientationPositions).length > 1) {
            currentOrientationCount = currentOrientationCount - 1;
            renderOrientacion();
        }
    };
    oriSection.appendChild(removeOriBtn);

    const oriSizeLabel = document.createElement('label');
    oriSizeLabel.textContent = " Altura: ";
    oriSection.appendChild(oriSizeLabel);

    const oriHeightInput = document.createElement('input');
    oriHeightInput.type = "number";
    oriHeightInput.value = orientationHeight ? parseInt(orientationHeight) : "";
    oriHeightInput.style.width = "50px";
    oriHeightInput.addEventListener('input', function () {
        orientationHeight = oriHeightInput.value + "px";
        renderOrientacion();
    });
    oriSection.appendChild(oriHeightInput);

    devMenu.appendChild(oriSection);

    const saveBtn = document.createElement('button');
    saveBtn.textContent = "Guardar";
    saveBtn.style.marginLeft = "20px";
    saveBtn.onclick = function () {
        const cavElems = document.querySelectorAll('.cavities-container .cavity');
        let newCavityPositions = {};
        cavElems.forEach(el => {
            const id = el.dataset.id;
            newCavityPositions["cavity(" + id + ")"] = {
                top: parseFloat(el.style.top),
                left: parseFloat(el.style.left)
            };
        });
        const oriElems = document.querySelectorAll('.orientation-container .orientation-object');
        let newOrientationPositions = {};
        let newOrientationConfigs = {};
        oriElems.forEach(el => {
            const id = el.id.match(/\d+/)[0];
            newOrientationPositions["orientation(" + id + ")"] = {
                top: parseFloat(el.style.top || 0),
                left: parseFloat(el.style.left || 0)
            };
            newOrientationConfigs["orientation(" + id + ")"] = el.dataset.orientation || "right";
        });
        const lockElem = document.getElementById('lock-element');
        let newLockExpected = lockElem.dataset.state;

        // Generar contenido del archivo parameters.js
        const content =
            `
// DevMenu
let cavidadWidth = "${cavidadWidth}";
let cavidadHeight = "${cavidadHeight}";
let angularShape = ${angularShape};

let orientationHeight = "${orientationHeight}";

// Posiciones
let cavityPositions = ${JSON.stringify(newCavityPositions, null, 2)};

let orientationPositions = ${JSON.stringify(newOrientationPositions, null, 2)};

// Asignaciones
let orientationConfigs = ${JSON.stringify(newOrientationConfigs, null, 2)};

let lockExpected = "${newLockExpected}";

let connections = ${JSON.stringify(userConnections.map(conn => ({
                cavityId: conn.cavityId,
                cableId: conn.cableId
            })), null, 2)};
`;
        const blob = new Blob([content], { type: "text/javascript" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "parameters.js";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };
    devMenu.appendChild(saveBtn);

    document.body.insertBefore(devMenu, document.body.firstChild);
}
