class BulletinStorage {
    constructor() {
        this.storageKey = 'norfolk_bulletins';
        // Load initial data from the hosted JSON file once
        this.initializeData();
    }

    async initializeData() {
        // If no local data exists, fetch from the hosted JSON file
        if (!localStorage.getItem(this.storageKey)) {
            try {
                const response = await fetch('data/bulletins.json');
                if (response.ok) {
                    const data = await response.json();
                    localStorage.setItem(this.storageKey, JSON.stringify(data));
                } else {
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
            return true;
        } catch (error) {
            console.error('Error saving data:', error);
            throw error;
        }
    }

    async loadData() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : {};
        } catch (error) {
            console.error('Error loading data:', error);
            return {};
        }
    }

    exportData() {
        const data = localStorage.getItem(this.storageKey);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'bulletins.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
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
                    reject(error);
                }
            };
            reader.onerror = (error) => reject(error);
            reader.readAsText(file);
        });
    }
}

// Create global instance
window.bulletinAPI = new BulletinStorage();