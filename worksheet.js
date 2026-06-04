const listContainer = document.getElementById('story-list-container');
const worksheetContainer = document.getElementById('worksheet-container');
const btnDropdownToggle = document.getElementById('btn-dropdown-toggle');
const btnClearSelection = document.getElementById('btn-clear-selection');
const btnPrint = document.getElementById('btn-print');

let selectedStoryIds = [];

// Guard against data.js failing to load
if (typeof storyData === 'undefined') {
    console.error('storyData is not defined — check that data.js loaded correctly.');
}

// Toggle Dropdown
btnDropdownToggle.addEventListener('click', () => listContainer.classList.toggle('show'));

// Close Dropdown on outside click
document.addEventListener('click', (event) => {
    if (!listContainer.contains(event.target) && event.target !== btnDropdownToggle) {
        listContainer.classList.remove('show');
    }
});

// Populate Dropdown
storyData.forEach(story => {
    const item = document.createElement('div');
    item.className = 'story-item';
    item.dataset.id = story.story_id;
    item.innerText = `${story.story_title_Greek} / ${story.story_title_English}`;

    item.addEventListener('click', () => {
        const id = story.story_id;
        if (selectedStoryIds.includes(id)) {
            selectedStoryIds = selectedStoryIds.filter(selectedId => selectedId !== id);
            item.classList.remove('selected');
        } else {
            selectedStoryIds.push(id);
            item.classList.add('selected');
        }
        generateWorksheet();
    });

    listContainer.appendChild(item);
});

// Clear All
btnClearSelection.addEventListener('click', () => {
    selectedStoryIds = [];
    document.querySelectorAll('.story-item').forEach(el => el.classList.remove('selected'));
    listContainer.classList.remove('show');
    generateWorksheet();
});

// Print Button
btnPrint.addEventListener('click', () => {
    if (selectedStoryIds.length === 0) {
        alert("Please select at least one story for the quiz first!");
        return;
    }
    window.print(); // Triggers the browser's print dialog
});

// Generate Worksheet Layout
function generateWorksheet() {
    const worksheetContainer = document.getElementById('worksheet-container');
    worksheetContainer.innerHTML = '';
    
    const selectedStories = storyData.filter(story => selectedStoryIds.includes(story.story_id));
    if (selectedStories.length === 0) return;

    let htmlString = ``;

    // --- 1. BUILD THE STUDENT QUIZZES ---
    selectedStories.forEach((story, index) => {
        if (index > 0) {
            htmlString += `<div class="page-break"></div>`;
        }

        htmlString += `
            <div class="quiz-header">
                <div class="quiz-top-row">
                    <h2 class="quiz-main-title">QUIZ</h2>
                    <div class="quiz-name-line">Name: __________________________________________________________</div>
                </div>
                <h3 class="quiz-subtitle">${story.story_title_English}</h3>
            </div>
        `;
        
        story.sentences.forEach((sentence, i) => {
            htmlString += `
                <div class="quiz-item">
                    <div class="greek-text">${i + 1}. ${sentence.greek}</div>
                    <div class="blank-line"></div>
                    <div class="blank-line"></div>
                </div>
            `;
        });
    });

    // --- 2. BUILD THE ANSWER KEYS ---
    htmlString += `<div class="page-break"></div>`;

    selectedStories.forEach((story, index) => {
        if (index > 0) {
            htmlString += `<div class="page-break"></div>`;
        }

        htmlString += `
            <div class="quiz-header">
                <div class="quiz-top-row">
                    <h2 class="quiz-main-title">ANSWER KEY</h2>
                </div>
                <h3 class="quiz-subtitle">${story.story_title_English}</h3>
            </div>
        `;
        
        story.sentences.forEach((sentence, i) => {
            htmlString += `
                <div class="quiz-item">
                    <div class="greek-text">${i + 1}. ${sentence.greek}</div>
                    <div class="answer-text"><strong>Literal:</strong> ${sentence.literal_english}</div>
                    <div class="answer-text"><strong>Smooth:</strong> ${sentence.smooth_english}</div>
                </div>
            `;
        });
    });

    worksheetContainer.innerHTML = htmlString;
}
