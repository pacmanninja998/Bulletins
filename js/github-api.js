class BulletinStorage {
    constructor() {
        this.storageKey = 'norfolk_bulletins';
        // Add base URL for GitHub Pages
        this.baseUrl = '/Bulletins/';
        this.initializeData();
    }

    async initializeData() {
        if (!localStorage.getItem(this.storageKey)) {
            try {
                // Use full path from repository root
                const response = await fetch(this.baseUrl + 'data/bulletins.json');
                if (response.ok) {
                    const data = await response.json();
                    localStorage.setItem(this.storageKey, JSON.stringify(data));
                    console.log('Successfully loaded initial data');
                } else {
                    console.error('Error loading data:', response.status, response.statusText);
                    localStorage.setItem(this.storageKey, '{}');
                }
            } catch (error) {
                console.error('Error loading initial data:', error);
                localStorage.setItem(this.storageKey, '{}');
            }
        }
    }

    async saveData(bulletinData) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(bulletinData));
            console.log('Data saved successfully');
            return true;
        } catch (error) {
            console.error('Error saving data:', error);
            throw error;
        }
    }

    async loadData() {
        try {
            // First try to get data from localStorage
            const localData = localStorage.getItem(this.storageKey);
            if (localData) {
                return JSON.parse(localData);
            }

            // If no local data, try to fetch from file
            const response = await fetch(this.baseUrl + 'data/bulletins.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            localStorage.setItem(this.storageKey, JSON.stringify(data));
            return data;
        } catch (error) {
            console.error('Error loading data:', error);
            // Return empty object instead of throwing
            return {};
        }
    }

    exportData() {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (!data) {
                throw new Error('No data to export');
            }
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'bulletins.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting data:', error);
            throw error;
        }
    }

    importData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    localStorage.setItem(this.storageKey, JSON.stringify(data));
                    resolve(data);
                } catch (error) {
                    console.error('Error parsing import file:', error);
                    reject(error);
                }
            };
            reader.onerror = (error) => {
                console.error('Error reading file:', error);
                reject(error);
            };
            reader.readAsText(file);
        });
    }
}

// Create global instance
window.bulletinAPI = new BulletinStorage();