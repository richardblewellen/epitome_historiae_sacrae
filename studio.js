const API_URL = "data.json";

const masterSetSelect = document.getElementById('select-master-set');
const listContainer = document.getElementById('story-list-container');
const worksheetContainer = document.getElementById('worksheet-container');
const btnDropdownToggle = document.getElementById('btn-dropdown-toggle');
const btnClearSelection = document.getElementById('btn-clear-selection');
const btnPrint = document.getElementById('btn-print');
const loadingMessage = document.getElementById('loading-message');
const controlsGroup = document.getElementById('controls-selection-group');
const typeRadios = document.querySelectorAll('input[name="worksheet-type"]');

let masterSetData = [];
let currentSetId = "";
let selectedGroupIds = [];

// --- 1. DATA FETCHING ---
async function fetchReaderData() {
    try {
        const response = await fetch(API_URL);
        const jsonData = await response.json();
        
        masterSetData = jsonData.sets;
        
        if(loadingMessage) loadingMessage.style.display = 'none';
        if(controlsGroup) controlsGroup.style.display = 'flex';
        initMasterSets();
        
    } catch (error) {
        console.error("Error fetching data:", error);
        if(loadingMessage) {
            loadingMessage.innerText = "Error loading database.";
            loadingMessage.style.color = "red";
        }
    }
}

// --- 2. DROPDOWN LOGIC ---
function initMasterSets() {
    masterSetSelect.innerHTML = '';
    const defaultOption = document.createElement('option');
    defaultOption.value = "";
    defaultOption.innerText = "Pick your set...";
    defaultOption.disabled = true;
    defaultOption.selected = true;
    masterSetSelect.appendChild(defaultOption);
    
    masterSetData.forEach(set => {
        const option = document.createElement('option');
        option.value = set.set_id;
        option.innerText = set.set_title;
        masterSetSelect.appendChild(option);
    });
}

masterSetSelect.addEventListener('change', (e) => {
    currentSetId = e.target.value;
    populateGroupDropdown();
    listContainer.classList.add('show');
});

function populateGroupDropdown() {
    listContainer.innerHTML = '';
    selectedGroupIds = []; 
    generateWorksheet();

    const activeSet = masterSetData.find(set => set.set_id === currentSetId);
    if (!activeSet) return;

    activeSet.groups.forEach(group => {
        const item = document.createElement('div');
        item.className = 'story-item';
        item.dataset.id = group.group_id;
        item.innerText = `${group.group_title}`;

        item.addEventListener('click', () => {
            const id = group.group_id;
            if (selectedGroupIds.includes(id)) {
                selectedGroupIds = selectedGroupIds.filter(selectedId => selectedId !== id);
                item.classList.remove('selected');
            } else {
                selectedGroupIds.push(id);
                item.classList.add('selected');
            }
            generateWorksheet();
        });
        listContainer.appendChild(item);
    });
}

// Dropdown UI Listeners
btnDropdownToggle.addEventListener('click', () => listContainer.classList.toggle('show'));

document.addEventListener('click', (event) => {
    if (!listContainer.contains(event.target) && event.target !== btnDropdownToggle) {
        listContainer.classList.remove('show');
    }
});

btnClearSelection.addEventListener('click', () => {
    selectedGroupIds = [];
    document.querySelectorAll('.story-item').forEach(el => el.classList.remove('selected'));
    listContainer.classList.remove('show');
    generateWorksheet();
});

// --- 3. DYNAMIC CSS SLIDERS ---
const root = document.documentElement;

document.getElementById('print-font-size').addEventListener('input', (e) => {
    document.getElementById('val-font').innerText = e.target.value;
    root.style.setProperty('--greek-font', e.target.value + 'em');
});

document.getElementById('print-spacing').addEventListener('input', (e) => {
    document.getElementById('val-spacing').innerText = e.target.value;
    root.style.setProperty('--row-spacing', e.target.value + 'px');
});

document.getElementById('print-blank-line').addEventListener('input', (e) => {
    document.getElementById('val-blank').innerText = e.target.value;
    root.style.setProperty('--blank-line-height', e.target.value + 'px');
});

// --- 4. WORKSHEET GENERATOR ---
typeRadios.forEach(radio => {
    radio.addEventListener('change', generateWorksheet);
});

function generateWorksheet() {
    worksheetContainer.innerHTML = '';
    
    const activeSet = masterSetData.find(set => set.set_id === currentSetId);
    if (!activeSet) {
        worksheetContainer.innerHTML = `<div style="text-align: center; color: #999; margin-top: 50px;"><em>Select a set and stories from the sidebar to generate a preview.</em></div>`;
        return;
    }

    let selectedGroups = [];
    let isDefaultContinuous = false;

    if (selectedGroupIds.length === 0) {
        selectedGroups = activeSet.groups; 
        isDefaultContinuous = true; 
    } else {
        selectedGroups = activeSet.groups.filter(group => selectedGroupIds.includes(group.group_id));
    }

    if (selectedGroups.length === 0) return;

    const documentType = document.querySelector('input[name="worksheet-type"]:checked').value;
    let htmlString = ``;

    if (documentType === "study-sheet") {
        selectedGroups.forEach((group, index) => {
            if (index > 0 && !isDefaultContinuous) htmlString += `<div class="page-break"></div>`;
            else if (index > 0 && isDefaultContinuous) htmlString += `<div style="margin-top: 40px;"></div>`; 

            htmlString += `<div class="group-wrapper">
                <div class="quiz-header" style="margin-bottom: 15px;">
                    <h2 class="quiz-main-title" style="font-size: 1.8em;">${group.group_title}</h2>
                </div>`;
            
            group.sentences.forEach(sentence => {
                htmlString += `
                    <div class="study-sheet-grid">
                        <div class="study-number">${sentence.sentence_id}.</div>
                        <div class="study-greek">${sentence.greek}</div>
                        <div class="study-english">${sentence.smooth_english}</div>
                    </div>`;
            });
            htmlString += `</div>`;
        });

   } else if (documentType === "quiz") {
        selectedGroups.forEach((group, index) => {
            if (index > 0) htmlString += `<div class="page-break"></div>`;

            for (let i = 0; i < 2; i++) {
                const positionClass = (i === 0) ? 'top-quiz' : 'bottom-quiz';
                htmlString += `<div class="quiz-half-page ${positionClass}">
                    <div class="quiz-header">
                        <div class="quiz-top-row">
                            <h2 class="quiz-main-title">QUIZ</h2>
                            <div class="quiz-name-line">Name: __________________________________________________________</div>
                        </div>
                        <h3 class="quiz-subtitle">${group.group_title}</h3>
                    </div>`;
                
                group.sentences.forEach(sentence => {
                    htmlString += `
                        <div class="quiz-item">
                            <div class="greek-text"><span style="color:#888; font-size:0.8em; margin-right:5px;">${sentence.sentence_id}.</span> ${sentence.greek}</div>
                            <div class="blank-line"></div>
                        </div>`;
                });
                htmlString += `</div>`;
            }
        });

        htmlString += `<div class="page-break"></div>`; 

        selectedGroups.forEach((group, index) => {
            if (index > 0) htmlString += `<div class="page-break"></div>`;

            for (let i = 0; i < 2; i++) {
                const positionClass = (i === 0) ? 'top-quiz' : 'bottom-quiz';
                htmlString += `<div class="quiz-half-page ${positionClass}">
                    <div class="quiz-header">
                        <div class="quiz-top-row">
                            <h2 class="quiz-main-title">ANSWER KEY</h2>
                            <div class="quiz-name-line">Name: __________________________________________________________</div>
                        </div>
                        <h3 class="quiz-subtitle">${group.group_title}</h3>
                    </div>`;
                
                group.sentences.forEach(sentence => {
                    htmlString += `
                        <div class="quiz-item">
                            <div class="greek-text"><span style="color:#888; font-size:0.8em; margin-right:5px;">${sentence.sentence_id}.</span> ${sentence.greek}</div>
                            <div class="blank-line" style="border:none; color: #555; display:flex; align-items:flex-end;">
                                ${sentence.smooth_english}
                            </div>
                        </div>`;
                });
                htmlString += `</div>`;
            }
        });
    }

    worksheetContainer.innerHTML = htmlString;
}

// Print Handler
btnPrint.addEventListener('click', () => {
    if (!currentSetId) {
        alert("Please select a set from the top menu first!");
        return;
    }
    window.print(); 
});

// Boot App
fetchReaderData();

// --- 5. AUDIO EXPORT LOGIC ---
const repeatValues = { 1: 1, 2: 2, 3: 3, 4: 5 }; // Same 1x, 2x, 3x, 5x mapping

const sliderExportSpeed = document.getElementById('export-slider-speed');
const sliderExportPause = document.getElementById('export-slider-pause');
const sliderExportRepeat = document.getElementById('export-slider-repeat');
const btnExportAudio = document.getElementById('btn-export-audio');
const audioStatus = document.getElementById('audio-status');

// Update Slider Labels
sliderExportSpeed.addEventListener('input', e => document.getElementById('export-speed-val').innerText = e.target.value);
sliderExportPause.addEventListener('input', e => document.getElementById('export-pause-val').innerText = e.target.value);
sliderExportRepeat.addEventListener('input', e => document.getElementById('export-repeat-val').innerText = repeatValues[parseInt(e.target.value)]);

btnExportAudio.addEventListener('click', async () => {
    if (selectedGroupIds.length === 0) {
        alert("Please select at least one story to generate audio.");
        return;
    }

    const speed = parseFloat(sliderExportSpeed.value);
    const pauseSeconds = parseFloat(sliderExportPause.value);
    const repeats = repeatValues[parseInt(sliderExportRepeat.value)];

    // 1. Gather all Greek text
    const activeSet = masterSetData.find(set => set.set_id === currentSetId);
    const selectedGroups = activeSet.groups.filter(g => selectedGroupIds.includes(g.group_id));
    
    let sentencesToProcess = [];
    selectedGroups.forEach(group => {
        group.sentences.forEach(s => sentencesToProcess.push(s.greek));
    });

    audioStatus.style.color = "#0d6efd";
    audioStatus.innerText = `Preparing ${sentencesToProcess.length} sentences...`;
    btnExportAudio.disabled = true;

   try {
        const sampleRate = 16000; // Piper's 'low' models specifically output at 16kHz
        let finalPcmData = []; // This will hold our raw audio floats

        for (let i = 0; i < sentencesToProcess.length; i++) {
            audioStatus.innerText = `Synthesizing sentence ${i + 1} of ${sentencesToProcess.length}...`;
            
            for (let r = 0; r < repeats; r++) {
                // --- PIPER TTS INTEGRATION POINT ---
                // We will call the Piper Web Worker here. 
                // For this step, we await the Float32Array audio buffer from Piper.
                const sentenceAudioData = await synthesizeWithPiper(sentencesToProcess[i], speed);
                
                // Append the sentence audio to our master track
                finalPcmData.push(...sentenceAudioData);

                // Add pause (silence) between repeats and sentences
                if (pauseSeconds > 0) {
                    const silenceSamples = sampleRate * pauseSeconds;
                    finalPcmData.push(...new Float32Array(silenceSamples)); 
                }
            }
        }

        audioStatus.innerText = `Encoding to MP3...`;
        
        // --- 2. ENCODE TO MP3 USING LAMEJS ---
        // Lamejs requires Int16Array data, but Web Audio uses Float32Array
        // We must convert the floats (-1.0 to 1.0) to 16-bit integers (-32768 to 32767)
        const mp3encoder = new lamejs.Mp3Encoder(1, sampleRate, 128); // Mono, Sample Rate, 128kbps
        const samples = new Int16Array(finalPcmData.length);
        for (let i = 0; i < finalPcmData.length; i++) {
            let s = Math.max(-1, Math.min(1, finalPcmData[i])); // clamp
            samples[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Encode the chunks
        const sampleBlockSize = 1152; 
        const mp3Data = [];
        for (let i = 0; i < samples.length; i += sampleBlockSize) {
            const sampleChunk = samples.subarray(i, i + sampleBlockSize);
            const mp3buf = mp3encoder.encodeBuffer(sampleChunk);
            if (mp3buf.length > 0) mp3Data.push(mp3buf);
        }
        const mp3buf = mp3encoder.flush(); 
        if (mp3buf.length > 0) mp3Data.push(mp3buf);

        // --- 3. DOWNLOAD THE MP3 ---
        const blob = new Blob(mp3Data, { type: 'audio/mp3' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        const safeSetId = currentSetId.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        a.download = `${safeSetId}_worksheet_audio.mp3`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        audioStatus.style.color = "#198754";
        audioStatus.innerText = "MP3 Downloaded Successfully!";

    } catch (error) {
        console.error("Audio export failed:", error);
        audioStatus.style.color = "red";
        audioStatus.innerText = "Error generating audio.";
    } finally {
        btnExportAudio.disabled = false;
        setTimeout(() => audioStatus.innerText = "", 4000);
    }
});

// Start the background worker
const ttsWorker = new Worker('piper-worker.js');
let isPiperReady = false;

// Tell it to load the heavy models as soon as the page loads
ttsWorker.postMessage({ type: 'INIT' });

ttsWorker.onmessage = (e) => {
    if (e.data.type === 'READY') {
        console.log("Piper TTS is ready!");
        isPiperReady = true;
    } else if (e.data.type === 'ERROR') {
        console.error("Piper TTS Error:", e.data.error);
    }
};

// The function that the MP3 exporter calls
function synthesizeWithPiper(text, speed) {
    return new Promise((resolve, reject) => {
        if (!isPiperReady) {
            return reject(new Error("Voice model is still loading. Please wait a few seconds."));
        }

        // Listen for the specific audio response
        const handleMessage = (e) => {
            if (e.data.type === 'AUDIO') {
                ttsWorker.removeEventListener('message', handleMessage);
                resolve(e.data.audio);
            } else if (e.data.type === 'ERROR') {
                ttsWorker.removeEventListener('message', handleMessage);
                reject(new Error(e.data.error));
            }
        };
        
        ttsWorker.addEventListener('message', handleMessage);
        
        // Ask the worker to generate the audio
        ttsWorker.postMessage({ type: 'SPEAK', text: text, speed: speed });
    });
}
