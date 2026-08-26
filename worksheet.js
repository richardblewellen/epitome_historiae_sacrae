// --- 1. Initialization & UI Setup ---
const API_URL = "data.json"; // Ensures it uses the same database as the reader!

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

// Fetch the data from the JSON API
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
            loadingMessage.innerText = "Error loading database. Please check your connection.";
            loadingMessage.style.color = "red";
        }
    }
}

// Populate the top-level Dropdown (Sets/Books)
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

    currentSetId = "";
    listContainer.innerHTML = '';
}

// When the user changes the Set/Book, update the secondary Dropdown
masterSetSelect.addEventListener('change', (e) => {
    currentSetId = e.target.value;
    populateGroupDropdown();
    listContainer.classList.add('show');
});

// Populate the secondary Dropdown (Stories/Chapters)
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

// UI Listeners
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

// Redraw whenever the user clicks Study Sheet or Quiz
typeRadios.forEach(radio => {
    radio.addEventListener('change', generateWorksheet);
});
document.getElementById('toggle-scramble').addEventListener('change', generateWorksheet);

btnPrint.addEventListener('click', () => {
    if (!currentSetId) {
        alert("Please select a set from the top menu first!");
        return;
    }
    window.print(); 
});

// Start the fetch process
fetchReaderData();


// --- 2. Generate Worksheet Layout ---
function generateWorksheet() {
    worksheetContainer.innerHTML = '';
    
    const activeSet = masterSetData.find(set => set.set_id === currentSetId);
    if (!activeSet) return;

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
        // --- TWO-COLUMN STUDY SHEET ---
        selectedGroups.forEach((group, index) => {
            if (index > 0 && !isDefaultContinuous) {
                htmlString += `<div class="page-break"></div>`;
            } else if (index > 0 && isDefaultContinuous) {
                htmlString += `<div style="margin-top: 40px;"></div>`; 
            }

            // Wrap the entire group
            htmlString += `<div class="group-wrapper">`;

            htmlString += `
                <div class="quiz-header" style="margin-bottom: 15px;">
                    <h2 class="quiz-main-title" style="font-size: 1.8em;">${group.group_title}</h2>
                </div>
            `;
            
            group.sentences.forEach(sentence => {
                htmlString += `
                    <div class="study-sheet-grid">
                        <div class="study-number">${sentence.sentence_id}.</div>
                        <div class="study-greek">${sentence.greek}</div>
                        <div class="study-english">${sentence.smooth_english}</div>
                    </div>
                `;
            });

            // Close the group wrapper
            htmlString += `</div>`;
        });

   } else if (documentType === "quiz") {
        const isScrambled = document.getElementById('toggle-scramble').checked;

        // --- QUIZZES ---
        selectedGroups.forEach((group, index) => {
            if (index > 0) {
                htmlString += `<div class="page-break"></div>`;
            }

            // Create a copy of the sentences and shuffle it if checked
            let displaySentences = [...group.sentences];
            if (isScrambled) {
                for (let i = displaySentences.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [displaySentences[i], displaySentences[j]] = [displaySentences[j], displaySentences[i]];
                }
            }

            // Print the top and bottom quiz halves
            for (let i = 0; i < 2; i++) {
                const positionClass = (i === 0) ? 'top-quiz' : 'bottom-quiz';

                htmlString += `<div class="quiz-half-page ${positionClass}">`;
                htmlString += `
                    <div class="quiz-header">
                        <div class="quiz-top-row">
                            <h2 class="quiz-main-title">QUIZ</h2>
                            <div class="quiz-name-line">Name: __________________________________________________________</div>
                        </div>
                        <h3 class="quiz-subtitle">${group.group_title}</h3>
                    </div>
                `;
                
                displaySentences.forEach((sentence, idx) => {
                    htmlString += `
                        <div class="quiz-item">
                            <div class="greek-text">${idx + 1}. ${sentence.greek}</div>
                            <div class="blank-line"></div>
                        </div>
                    `;
                });

                htmlString += `</div>`; 
            }
            
            // Store the scrambled order so the answer key block below can use it
            group.scrambledSentences = displaySentences; 
        });

        // --- ANSWER KEYS ---
        htmlString += `<div class="page-break"></div>`; 

        selectedGroups.forEach((group, index) => {
            if (index > 0) {
                htmlString += `<div class="page-break"></div>`;
            }

            // Retrieve the exact same scrambled order used for the quizzes
            const answerSentences = group.scrambledSentences || group.sentences;

            for (let i = 0; i < 2; i++) {
                const positionClass = (i === 0) ? 'top-quiz' : 'bottom-quiz';

                htmlString += `<div class="quiz-half-page ${positionClass}">`;
                htmlString += `
                    <div class="quiz-header">
                        <div class="quiz-top-row">
                            <h2 class="quiz-main-title">ANSWER KEY</h2>
                            <div class="quiz-name-line">Name: __________________________________________________________</div>
                        </div>
                        <h3 class="quiz-subtitle">${group.group_title}</h3>
                    </div>
                `;
                
                answerSentences.forEach((sentence, idx) => {
                    htmlString += `
                        <div class="quiz-item">
                            <div class="greek-text">${idx + 1}. ${sentence.greek}</div>
                            <div class="blank-line" style="font-size: 0.95em; color: #333; line-height: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                ${sentence.smooth_english}
                            </div>
                        </div>
                    `;
                });

                htmlString += `</div>`; 
            }
        });
    }

    worksheetContainer.innerHTML = htmlString;
}
