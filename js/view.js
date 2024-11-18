document.addEventListener('DOMContentLoaded', async function() {
    
	//Clear Cache
	localStorage.clear();
	console.log('Cache cleared');
	
	// DOM Elements
    const searchInput = document.getElementById('search-input');
    const shiftFilter = document.getElementById('shift-filter');
    const positionFilter = document.getElementById('position-filter');
    const restDaysFilter = document.getElementById('rest-days-filter');
    const districtFilter = document.getElementById('district-filter');
	let bulletins = {};
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

    // Initialize drawer state
    let isDrawerOpen = false;

    // Drawer toggle functionality
    drawerToggle.addEventListener('click', () => {
        isDrawerOpen = !isDrawerOpen;
        selectedBulletinsContainer.classList.toggle('open', isDrawerOpen);
        drawerToggle.classList.toggle('open', isDrawerOpen);
        drawerToggle.querySelector('.arrow').textContent = isDrawerOpen ? '►' : '◄';
    });

    // Close drawer when clicking outside
    document.addEventListener('click', (e) => {
        if (isDrawerOpen && 
            !selectedBulletinsContainer.contains(e.target) && 
            !drawerToggle.contains(e.target)) {
            isDrawerOpen = false;
            selectedBulletinsContainer.classList.remove('open');
            drawerToggle.classList.remove('open');
            drawerToggle.querySelector('.arrow').textContent = '◄';
        }
    });

    let filteredBulletins = {};

    // Initialize
	localStorage.removeItem('norfolk_bulletins');
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
                    <h3>${data.jobId || 'N/A'}</h3>
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

    function capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    function handleCardSelection(event, bulletinNumber) {
        if (event.target.checked) {
            selectedBulletins.add(bulletinNumber);
            /* if (window.innerWidth <= 768) {
                selectedBulletinsContainer.classList.add('open');
                drawerToggle.classList.add('open');
                drawerToggle.querySelector('.arrow').textContent = '►';
            } */
        } else {
            selectedBulletins.delete(bulletinNumber);
        }
        updateSelectedList();
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
		if (!container || !container.children.length) return;

		let touchTimeout;
		const LONG_PRESS_DURATION = 500;

		Array.from(container.children).forEach(item => {
			const dragHandle = item.querySelector('.drag-handle');
			let draggedItem = null;
			let startY = 0;
			let currentY = 0;
			let isDragging = false;

			dragHandle.addEventListener('touchstart', (e) => {
				startY = e.touches[0].pageY;
				currentY = startY;
				
				touchTimeout = setTimeout(() => {
					isDragging = true;
					draggedItem = item;
					const rect = draggedItem.getBoundingClientRect();
					
					draggedItem.classList.add('dragging');
					draggedItem.style.position = 'fixed';
					draggedItem.style.width = `${rect.width}px`;
					draggedItem.style.left = `${rect.left}px`;
					draggedItem.style.top = `${startY - rect.height/2}px`;
					draggedItem.style.zIndex = '1000';
					
					navigator.vibrate && navigator.vibrate(50);
				}, LONG_PRESS_DURATION);
			});

			dragHandle.addEventListener('touchmove', (e) => {
				if (!isDragging) {
					clearTimeout(touchTimeout);
					return;
				}
				e.preventDefault();
				
				const touch = e.touches[0];
				const rect = draggedItem.getBoundingClientRect();
				draggedItem.style.top = `${touch.pageY - rect.height/2}px`;

				// Reset all items' positions first
				container.querySelectorAll('.selected-item').forEach(item => {
					if (item !== draggedItem) {
						item.style.transform = '';
						item.style.transition = 'transform 0.2s ease';
					}
				});

				const elemBelow = document.elementFromPoint(touch.clientX, touch.pageY);
				const droppableItem = elemBelow?.closest('.selected-item');
				
				if (droppableItem && droppableItem !== draggedItem) {
					const droppableRect = droppableItem.getBoundingClientRect();
					const middle = droppableRect.top + droppableRect.height/2;
					
					if (touch.pageY > middle) {
						const nextItems = getNextSiblings(droppableItem, draggedItem);
						nextItems.forEach(item => {
							item.style.transform = 'translateY(60px)';
						});
						if (droppableItem.nextElementSibling !== draggedItem) {
							container.insertBefore(draggedItem, droppableItem.nextElementSibling);
						}
					} else {
						const prevItems = getPreviousSiblings(droppableItem, draggedItem);
						prevItems.forEach(item => {
							item.style.transform = 'translateY(-60px)';
						});
						if (droppableItem.previousElementSibling !== draggedItem) {
							container.insertBefore(draggedItem, droppableItem);
						}
					}
				}
			});

			dragHandle.addEventListener('touchend', () => {
				clearTimeout(touchTimeout);
				if (!isDragging) return;
				
				isDragging = false;
				if (draggedItem) {
					draggedItem.classList.remove('dragging');
					draggedItem.style.position = '';
					draggedItem.style.width = '';
					draggedItem.style.left = '';
					draggedItem.style.top = '';
					draggedItem.style.zIndex = '';
					draggedItem.style.transform = '';
					
					selectedBulletins = new Set(
						Array.from(container.children).map(el => el.dataset.number)
					);
					
					draggedItem = null;
				}
			});

			dragHandle.addEventListener('touchmove', (e) => {
				if (isDragging) e.preventDefault();
			}, { passive: false });

			// Desktop functionality
			let originalIndex = null;

			dragHandle.addEventListener('mousedown', (e) => {
				draggedItem = item;
				originalIndex = Array.from(container.children).indexOf(item);
				
				item.classList.add('dragging');
				item.style.position = 'absolute';
				item.style.zIndex = '1000';
				
				moveAt(e.pageY);
				
				function moveAt(pageY) {
					const containerRect = container.getBoundingClientRect();
					const itemHeight = item.offsetHeight;
					const relativeY = pageY - containerRect.top - window.scrollY;
					const newIndex = Math.floor(relativeY / itemHeight);
					
					if (newIndex >= 0 && newIndex < container.children.length) {
						const currentIndex = Array.from(container.children).indexOf(draggedItem);
						if (newIndex !== currentIndex) {
							if (newIndex < currentIndex) {
								container.insertBefore(draggedItem, container.children[newIndex]);
							} else {
								container.insertBefore(draggedItem, container.children[newIndex + 1]);
							}
						}
					}
					item.style.top = `${relativeY}px`;
				}

				function onMouseMove(e) {
					moveAt(e.pageY);
					container.querySelectorAll('.selected-item').forEach(item => {
						if (item !== draggedItem) {
							item.style.transform = '';
							item.style.transition = 'transform 0.2s ease';
						}
					});
					
					const elemBelow = document.elementFromPoint(e.clientX, e.pageY);
					const droppableItem = elemBelow?.closest('.selected-item');
					
					if (droppableItem && droppableItem !== draggedItem) {
						// Move other items to make space
						const rect = droppableItem.getBoundingClientRect();
						const middle = rect.top + rect.height / 2;
						
						if (e.pageY > middle) {
							const nextItems = getNextSiblings(droppableItem, draggedItem);
							nextItems.forEach(item => {
								item.style.transform = 'translateY(60px)';
							});
						} else {
							const prevItems = getPreviousSiblings(droppableItem, draggedItem);
							prevItems.forEach(item => {
								item.style.transform = 'translateY(-60px)';
							});
						}
					}
				}

				function onMouseUp() {
					document.removeEventListener('mousemove', onMouseMove);
					document.removeEventListener('mouseup', onMouseUp);
					
					item.classList.remove('dragging');
					item.style.position = '';
					item.style.top = '';
					item.style.zIndex = '';
					
					container.querySelectorAll('.selected-item').forEach(item => {
						item.style.transform = '';
						item.style.transition = '';
					});

					selectedBulletins = new Set(
						Array.from(container.children).map(el => el.dataset.number)
					);
				}

				document.addEventListener('mousemove', onMouseMove);
				document.addEventListener('mouseup', onMouseUp);
			});

			dragHandle.addEventListener('dragstart', (e) => {
				e.preventDefault();
			});
		});
	}

	function getNextSiblings(elem, draggedItem) {
		const siblings = [];
		let sibling = elem.nextElementSibling;
		while (sibling) {
			if (sibling !== draggedItem) {
				siblings.push(sibling);
			}
			sibling = sibling.nextElementSibling;
		}
		return siblings;
	}

	function getPreviousSiblings(elem, draggedItem) {
		const siblings = [];
		let sibling = elem.previousElementSibling;
		while (sibling) {
			if (sibling !== draggedItem) {
				siblings.push(sibling);
			}
			sibling = sibling.previousElementSibling;
		}
		return siblings.reverse();
	}

	// Update styles for drag handle
	function updateSelectedList() {
		selectedList.innerHTML = Array.from(selectedBulletins)
			.map(number => {
				const data = bulletins[number];
				return `
					<div class="selected-item" data-number="${number}">
						<div class="drag-handle" touch-action="none" draggable="false">≡</div>
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

	function showBulletinDetails(number) {
		const data = bulletins[number];
		console.log("Bulletin data:", data);
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
					<p><strong>Job Name:</strong> ${data.jobName || 'N/A'}</p>
				</div>
			
				<div class="modal-section">
					<h3>Schedule Information</h3>
					<p><strong>Show Up Time:</strong> ${data.showUpTime}</p>
					<p><strong>Shift:</strong> ${data.shift}</p>
					<p><strong>Rest Days:</strong> ${data.restDays}</p>
				</div>

				<div class="modal-section">
					<h3>Comments</h3>
					<p>${data.comments ? data.comments : 'No comments available'}</p>
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