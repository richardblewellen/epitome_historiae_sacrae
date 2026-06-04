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
    worksheetContainer.innerHTML = '';
    
    const selectedStories = storyData.filter(story => selectedStoryIds.includes(story.story_id));
    if (selectedStories.length === 0) return;

    // --- 1. BUILD THE STUDENT QUIZ ---
    let htmlString = `
        <div class="worksheet-header">
            <h2>Translation Worksheet</h2>
            <p style="text-align: right; font-size: 1.1em;">Name: _______________________ &nbsp;&nbsp;&nbsp; Date: ___________</p>
        </div>
    `;

    selectedStories.forEach(story => {
        htmlString += `<h3>${story.story_title_Greek}</h3>`;
        
        story.sentences.forEach((sentence, index) => {
            htmlString += `
                <div class="quiz-item">
                    <div class="greek-text">${index + 1}. ${sentence.greek}</div>
                    <div class="blank-line"></div>
                    <div class="blank-line"></div>
                </div>
            `;
        });
    });

    // --- 2. BUILD THE ANSWER KEY ---
    // The .page-break class forces this to print on a brand new sheet of paper
    htmlString += `
        <div class="page-break"></div>
        <div class="worksheet-header">
            <h2>Teacher Answer Key</h2>
        </div>
    `;

    selectedStories.forEach(story => {
        htmlString += `<h3>${story.story_title_Greek}</h3>`;
        
        story.sentences.forEach((sentence, index) => {
            htmlString += `
                <div class="quiz-item">
                    <div class="greek-text">${index + 1}. ${sentence.greek}</div>
                    <div class="answer-text"><strong>Literal:</strong> ${sentence.literal_english}</div>
                    <div class="answer-text"><strong>Smooth:</strong> ${sentence.smooth_english}</div>
                </div>
            `;
        });
    });

    worksheetContainer.innerHTML = htmlString;
}
