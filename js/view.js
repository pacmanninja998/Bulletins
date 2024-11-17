document.addEventListener('DOMContentLoaded', async function() {
    // DOM Elements
    const searchInput = document.getElementById('search-input');
    const shiftFilter = document.getElementById('shift-filter');
    const positionFilter = document.getElementById('position-filter');
    const restDaysFilter = document.getElementById('rest-days-filter');
    const bulletinsGrid = document.getElementById('bulletins-grid');
    const modal = document.getElementById('bulletin-modal');
    const modalContent = document.getElementById('modal-content');
    const closeButton = document.querySelector('.close-button');

    let bulletins = {};
    let filteredBulletins = {};

    // Initialize
    try {
        bulletins = await bulletinAPI.loadData();  // Changed from githubAPI to bulletinAPI
        filteredBulletins = {...bulletins};
        renderBulletins();
    } catch (error) {
        console.error('Error loading bulletins:', error);
        bulletinsGrid.innerHTML = '<div class="error-message">Error loading bulletins. Please try again later.</div>';
    }

    // Event Listeners
    searchInput.addEventListener('input', filterBulletins);
    shiftFilter.addEventListener('change', filterBulletins);
    positionFilter.addEventListener('change', filterBulletins);
    restDaysFilter.addEventListener('change', filterBulletins);
    closeButton.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });

    function filterBulletins() {
        const searchTerm = searchInput.value.toLowerCase();
        const shiftValue = shiftFilter.value.toLowerCase();
        const positionValue = positionFilter.value.toLowerCase();
        const restDaysValue = restDaysFilter.value.toLowerCase();

        filteredBulletins = Object.entries(bulletins).reduce((acc, [number, data]) => {
            // Search term filter
            const matchesSearch = !searchTerm || 
                number.includes(searchTerm) ||
                data.jobId?.toLowerCase().includes(searchTerm) ||
                data.jobName?.toLowerCase().includes(searchTerm) ||
                data.showUpTime.toLowerCase().includes(searchTerm) ||
                data.restDays.toLowerCase().includes(searchTerm);

            // Shift filter
            const matchesShift = !shiftValue || 
                data.shift.toLowerCase() === shiftValue;

            // Position filter
            const matchesPosition = !positionValue || 
                data.position.toLowerCase() === positionValue;

            // Rest days filter
            const matchesRestDays = !restDaysValue || 
                data.restDays.toLowerCase().includes(restDaysValue);

            if (matchesSearch && matchesShift && matchesPosition && matchesRestDays) {
                acc[number] = data;
            }
            return acc;
        }, {});

        renderBulletins();
    }

    function renderBulletins() {
        if (Object.keys(filteredBulletins).length === 0) {
            bulletinsGrid.innerHTML = '<div class="no-results">No bulletins found matching your criteria.</div>';
            return;
        }

        bulletinsGrid.innerHTML = Object.entries(filteredBulletins)
            .sort(([,a], [,b]) => new Date(b.timestamp) - new Date(a.timestamp))
            .map(([number, data]) => createBulletinCard(number, data))
            .join('');

        // Add click listeners to cards
        document.querySelectorAll('.bulletin-card').forEach(card => {
            card.addEventListener('click', () => showBulletinDetails(card.dataset.number));
        });
    }

    function createBulletinCard(number, data) {
        const date = new Date(data.timestamp).toLocaleDateString();
        return `
            <div class="bulletin-card" data-number="${number}">
                <div class="bulletin-header">
                    <h3>Bulletin ${number}</h3>
                    <span class="bulletin-date">${date}</span>
                </div>
                <div class="bulletin-details">
                    <p><strong>Job ID:</strong> ${data.jobId || 'N/A'}</p>
                    <p><strong>Position:</strong> ${capitalizeFirst(data.position)}</p>
                    <p><strong>Show Up:</strong> ${data.showUpTime}</p>
                    <p><strong>Shift:</strong> ${data.shift}</p>
                    <p><strong>Rest Days:</strong> ${data.restDays}</p>
                    ${data.jobName ? `<p><strong>Job Name:</strong> ${data.jobName}</p>` : ''}
                </div>
            </div>
        `;
    }

    function showBulletinDetails(number) {
        const data = bulletins[number];
        const date = new Date(data.timestamp).toLocaleString();
        
        modalContent.innerHTML = `
            <h2>Bulletin ${number} Details</h2>
            <div class="modal-grid">
                <div class="modal-section">
                    <h3>Basic Information</h3>
                    <p><strong>Job ID:</strong> ${data.jobId || 'N/A'}</p>
                    <p><strong>Position:</strong> ${capitalizeFirst(data.position)}</p>
                    <p><strong>Date Added:</strong> ${date}</p>
                    ${data.jobName ? `<p><strong>Job Name:</strong> ${data.jobName}</p>` : ''}
                </div>
                
                <div class="modal-section">
                    <h3>Schedule Information</h3>
                    <p><strong>Show Up Time:</strong> ${data.showUpTime}</p>
                    <p><strong>Shift:</strong> ${data.shift}</p>
                    <p><strong>Rest Days:</strong> ${data.restDays}</p>
                </div>

                <div class="modal-section full-width">
                    <h3>Original Bulletin Text</h3>
                    <pre class="bulletin-text">${data.rawText || 'Not available'}</pre>
                </div>
            </div>
        `;
        
        modal.style.display = 'block';
    }

    // Utility function
    function capitalizeFirst(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
});