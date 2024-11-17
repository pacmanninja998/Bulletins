document.addEventListener('DOMContentLoaded', async function() {
    // DOM Elements
    const searchInput = document.getElementById('search-input');
    const shiftFilter = document.getElementById('shift-filter');
    const positionFilter = document.getElementById('position-filter');
    const restDaysFilter = document.getElementById('rest-days-filter');
    const districtFilter = document.getElementById('district-filter');
    const bulletinsGrid = document.getElementById('bulletins-grid');
    const modal = document.getElementById('bulletin-modal');
    const modalContent = document.getElementById('modal-content');
    const closeButton = document.querySelector('.close-button');
    let selectedBulletins = new Set();
    const selectedList = document.getElementById('selected-list');
    const selectedBulletinsContainer = document.querySelector('.selected-bulletins');

    // Create and add drawer toggle button
    const drawerToggle = document.createElement('div');
    drawerToggle.className = 'drawer-toggle';
    drawerToggle.innerHTML = '<span class="arrow">◄</span>';
    document.body.appendChild(drawerToggle);

    // Drawer toggle functionality
    drawerToggle.addEventListener('click', () => {
        const isOpen = selectedBulletinsContainer.classList.toggle('open');
        drawerToggle.classList.toggle('open');
        drawerToggle.querySelector('.arrow').textContent = isOpen ? '►' : '◄';
    });

    let bulletins = {};
    let filteredBulletins = {};

    // Initialize
    try {
        bulletins = await bulletinAPI.loadData();
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
    districtFilter.addEventListener('change', filterBulletins);
    closeButton.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });

    // Make these functions available globally for the onclick handlers
    window.handleCardSelection = handleCardSelection;
    window.copyBulletinNumber = copyBulletinNumber;

    function filterBulletins() {
        const searchTerm = searchInput.value.toLowerCase();
        const shiftValue = shiftFilter.value.toLowerCase();
        const positionValue = positionFilter.value.toLowerCase();
        const restDaysValue = restDaysFilter.value;
        const districtValue = districtFilter.value;

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
                (restDaysValue === 'weekend' ? 
                    // Check for any weekend rest days combination
                    (data.restDays.includes('FRI, SAT') || 
                    data.restDays.includes('SAT, SUN') || 
                    data.restDays.includes('SUN, MON')) :
                    // Regular rest days matching
                    data.restDays.includes(restDaysValue));

            // District filter
            const matchesDistrict = !districtValue || 
                data.district === districtValue;

            // Only add if all filters match
            if (matchesSearch && matchesShift && matchesPosition && 
                matchesRestDays && matchesDistrict) {
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
            const checkbox = card.querySelector('.card-checkbox');
            // Prevent card click when clicking checkbox
            checkbox.addEventListener('click', (e) => e.stopPropagation());
            // Add click handler to the rest of the card
            card.addEventListener('click', (e) => {
                if (e.target !== checkbox) {
                    showBulletinDetails(card.dataset.number);
                }
            });
        });
    }

    function createBulletinCard(number, data) {
        const date = new Date(data.timestamp).toLocaleDateString();
        return `
            <div class="bulletin-card" data-number="${number}">
                <input type="checkbox" 
                    class="card-checkbox" 
                    ${selectedBulletins.has(number) ? 'checked' : ''}
                    onchange="handleCardSelection(event, '${number}')">
                <div class="bulletin-header">
                    <h3>Job ID: ${data.jobId || 'N/A'}</h3>
                </div>
                <div class="bulletin-details">
                    <p><strong>Bulletin:</strong> ${number}</p>
                    <p><strong>District:</strong> ${data.district || 'N/A'}</p>
                    <p><strong>Position:</strong> ${capitalizeFirst(data.position)}</p>
                    <p><strong>Show Up:</strong> ${data.showUpTime}</p>
                    <p><strong>Shift:</strong> ${data.shift}</p>
                    <p><strong>Rest Days:</strong> ${data.restDays}</p>
                    ${data.jobName ? `<p><strong>Job Name:</strong> ${data.jobName}</p>` : ''}
                </div>
                <div class="bulletin-footer">
                    <span class="bulletin-date">Last updated: ${date}</span>
                </div>
            </div>
        `;
    }

    function handleCardSelection(event, bulletinNumber) {
        if (event.target.checked) {
            selectedBulletins.add(bulletinNumber);
            if (window.innerWidth <= 768) {
                selectedBulletinsContainer.classList.add('open');
                drawerToggle.classList.add('open');
                drawerToggle.querySelector('.arrow').textContent = '►';
            }
        } else {
            selectedBulletins.delete(bulletinNumber);
        }
        updateSelectedList();
    }

    function updateSelectedList() {
        selectedList.innerHTML = Array.from(selectedBulletins)
            .map(number => {
                const data = bulletins[number];
                return `
                    <div class="selected-item" data-number="${number}">
                        <div class="drag-handle" touch-action="none">≡</div>
                        <div class="selected-item-content">
                            <div><strong>${data.jobId}</strong></div>
                            <div class="bulletin-number" onclick="copyBulletinNumber('${number}')">${number}</div>
                            <div>Show up: ${data.showUpTime}</div>
                            <div>Rest Days: ${data.restDays}</div>
                        </div>
                    </div>
                `;
            })
            .join('');
    
        initializeDragAndDrop();
    }

    function copyBulletinNumber(number) {
        navigator.clipboard.writeText(number)
            .then(() => {
                const notification = document.createElement('div');
                notification.className = 'copy-notification';
                notification.textContent = 'Bulletin number copied!';
                document.body.appendChild(notification);
                setTimeout(() => notification.remove(), 2000);
            })
            .catch(err => console.error('Failed to copy:', err));
    }

    function initializeDragAndDrop() {
        const container = document.getElementById('selected-list');
        if (container.children.length > 0) {
            new Sortable(container, {
                animation: 150,
                handle: '.drag-handle',
                delay: 250,
                delayOnTouchOnly: true,
                touchStartThreshold: 10,
                fallbackTolerance: 10,
                forceFallback: true,
                dragClass: "sortable-drag",
                ghostClass: "sortable-ghost",
                chosenClass: "sortable-chosen",
                dragOverClass: "sortable-drag-over",
                scroll: true,
                scrollSensitivity: 30,
                scrollSpeed: 10,
                onStart: function(evt) {
                    document.body.style.overflow = 'hidden';
                    evt.item.classList.add('dragging');
                },
                onEnd: function(evt) {
                    document.body.style.overflow = '';
                    evt.item.classList.remove('dragging');
                    selectedBulletins = new Set(
                        Array.from(container.children).map(el => el.dataset.number)
                    );
                },
                onChange: function(evt) {
                    // Remove existing drop indicators
                    const indicators = container.querySelectorAll('.drop-indicator');
                    indicators.forEach(indicator => indicator.remove());
                    
                    // Add new drop indicator
                    if (evt.dragged && evt.related) {
                        const indicator = document.createElement('div');
                        indicator.className = 'drop-indicator';
                        evt.related.parentNode.insertBefore(indicator, evt.related);
                    }
                }
            });
        }
    }

	function showBulletinDetails(number) {
		const data = bulletins[number];
		const date = new Date(data.timestamp).toLocaleString();

		modalContent.innerHTML = `
			<div class="modal-header">
				<h2>Job ID: ${data.jobId || 'N/A'}</h2>
				<span class="close-button">&times;</span>
			</div>
			<div class="modal-grid">
				<div class="modal-section">
					<h3>Basic Information</h3>
					<p><strong>Bulletin Number:</strong> ${number}</p>
					<p><strong>Position:</strong> ${capitalizeFirst(data.position)}</p>
					<p><strong>Description:</strong> ${data.comments}</p>
					${data.jobName ? `<p><strong>Job Name:</strong> ${data.jobName}</p>` : ''}
				</div>
			
				<div class="modal-section">
					<h3>Schedule Information</h3>
					<p><strong>Show Up Time:</strong> ${data.showUpTime}</p>
					<p><strong>Shift:</strong> ${data.shift}</p>
					<p><strong>Rest Days:</strong> ${data.restDays}</p>
				</div>

				<div class="modal-footer">
					<span class="update-date">Last updated: ${date}</span>
					<button class="toggle-bulletin-text" onclick="toggleBulletinText(event)">Show Full Bulletin</button>
					<div class="bulletin-text-container" style="display: none;">
						<div class="bulletin-text">
							${data.rawText || 'Not available'}
						</div>
					</div>
				</div>
			</div>
		`;

		modal.style.display = 'block';

		// Re-attach close button event listener
		const newCloseButton = modalContent.querySelector('.close-button');
		newCloseButton.addEventListener('click', () => modal.style.display = 'none');
	}

	// Add this function for toggling the bulletin text
	window.toggleBulletinText = function(event) {
		const button = event.target;
		const container = button.nextElementSibling;
		const isVisible = container.style.display !== 'none';
		
		container.style.display = isVisible ? 'none' : 'block';
		button.textContent = isVisible ? 'Show Full Bulletin' : 'Hide Full Bulletin';
		
		if (!isVisible) {
			container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
		}
	}
});