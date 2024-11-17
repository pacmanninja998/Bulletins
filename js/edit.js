document.addEventListener('DOMContentLoaded', function() {
    const bulletinInput = document.getElementById('bulletin-input');
    const bulletinNumber = document.getElementById('bulletin-number');
    const extractedFields = document.getElementById('extracted-fields');
    const saveBtn = document.getElementById('save-btn');
    const messageDiv = document.getElementById('message');
    const positionBtns = document.querySelectorAll('.position-btn');
    const exportBtn = document.getElementById('export-data');
    const importTrigger = document.getElementById('import-trigger');
    const importInput = document.getElementById('import-data');
    
    let currentPosition = null;
    let lastParsedData = null;

    // Position button handlers
    positionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            positionBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPosition = btn.dataset.position;
        });
    });

    // Real-time parsing
    bulletinInput.addEventListener('input', debounce(async function() {
        const content = bulletinInput.value.trim();
        if (content.length < 10) return;

        try {
            const parsedData = BulletinParser.parseFullBulletin(content);
            lastParsedData = parsedData;
            
            // Auto-fill bulletin number if found
            if (parsedData.bulletinNumber && !bulletinNumber.value) {
                bulletinNumber.value = parsedData.bulletinNumber;
            }

            // Update extracted fields display
            updateExtractedFields(parsedData);
        } catch (error) {
            console.error('Parsing error:', error);
            showMessage('Error parsing bulletin text', 'error');
        }
    }, 500));

    // Save handler
    saveBtn.addEventListener('click', async () => {
        try {
            // Validation
            if (!bulletinInput.value.trim()) {
                throw new Error('Please enter bulletin text');
            }
            if (!bulletinNumber.value.match(/^\d{6}$/)) {
                throw new Error('Please enter a valid 6-digit bulletin number');
            }
            if (!currentPosition) {
                throw new Error('Please select a position (Engineer or Conductor)');
            }
            if (!lastParsedData) {
                throw new Error('Unable to parse bulletin data');
            }

            // Load existing data
            let bulletins = await bulletinAPI.loadData();
            
            // Prepare new bulletin data
            const bulletinData = {
                ...lastParsedData,
                position: currentPosition,
                timestamp: new Date().toISOString(),
                rawText: bulletinInput.value.trim()
            };

            // Update bulletins object
            bulletins[bulletinNumber.value] = bulletinData;

            // Save to storage
            await bulletinAPI.saveData(bulletins);

            // Success feedback
            showMessage('Bulletin saved successfully!', 'success');
            
            // Clear form
            bulletinInput.value = '';
            bulletinNumber.value = '';
            positionBtns.forEach(btn => btn.classList.remove('active'));
            currentPosition = null;
            lastParsedData = null;
            extractedFields.innerHTML = '';

        } catch (error) {
            console.error('Save error:', error);
            showMessage(error.message, 'error');
        }
    });

    // Import/Export handlers
    exportBtn.addEventListener('click', () => {
        bulletinAPI.exportData();
    });

    importTrigger.addEventListener('click', () => {
        importInput.click();
    });

    importInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            await bulletinAPI.importData(file);
            showMessage('Bulletins imported successfully!', 'success');
            // Clear the input so the same file can be imported again if needed
            importInput.value = '';
        } catch (error) {
            console.error('Import error:', error);
            showMessage('Error importing bulletins. Please check the file format.', 'error');
            importInput.value = '';
        }
    });

    function updateExtractedFields(data) {
        const fields = [
            { label: 'Job ID', value: data.jobId },
            { label: 'Bulletin Number', value: data.bulletinNumber },
            { label: 'Show Up Time', value: data.showUpTime },
            { label: 'Rest Days', value: data.restDays },
            { label: 'Shift', value: data.shift }
        ];

        if (data.jobName) {
            fields.push({ label: 'Job Name', value: data.jobName });
        }

        extractedFields.innerHTML = fields
            .map(field => `
                <div class="field">
                    <div class="field-label">${field.label}:</div>
                    <div class="field-value">${field.value || 'N/A'}</div>
                </div>
            `)
            .join('');
    }

    function showMessage(text, type) {
        messageDiv.textContent = text;
        messageDiv.className = `message ${type}`;
        setTimeout(() => {
            messageDiv.textContent = '';
            messageDiv.className = 'message';
        }, 5000);
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
});