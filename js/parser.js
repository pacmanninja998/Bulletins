class BulletinParser {
    static extractShowUpTime(content) {
        const patterns = [
            /ON DUTY TIME:\s*(\d{1,2}:\d{2}(?:AM|PM))/i,
            /ON DUTY:\s*(\d{1,2}:\d{2}(?:AM|PM))/i,
            /SHOW UP.*?(\d{1,2}:\d{2}(?:AM|PM))/i,
            /STARTING TIME:\s*(\d{1,2}:\d{2}(?:AM|PM))/i,
            /ON DUTY:\s*(\d{1,2}:\d{2})/i
        ];

        for (const pattern of patterns) {
            const match = content.match(pattern);
            if (match) {
                let time = match[1];
                if (!time.includes('AM') && !time.includes('PM')) {
                    const [hours, minutes] = time.split(':').map(Number);
                    const period = hours < 12 ? 'AM' : 'PM';
                    const adjustedHours = hours % 12 || 12;
                    time = `${adjustedHours}:${minutes.toString().padStart(2, '0')}${period}`;
                }
                return time;
            }
        }
        return "N/A";
    }

    static extractRestDays(content) {
        const patterns = [
            /REST DAYS:?\s*(.+?)(?:\)|$)/i,
            /ON DUTY:.*?(?:REST DAYS:\s*([^)]+))/i
        ];

        for (const pattern of patterns) {
            const match = content.match(pattern);
            if (match) {
                const days = match[1].trim()
                    .replace(/\s*\).*$/, '')
                    .replace(/&/g, ',')
                    .replace(/AND/gi, ',')
                    .trim();
                return days;
            }
        }
        return "N/A";
    }

    static extractJobId(content) {
        const patterns = [
            // Primary patterns
            /ASSIGN:\s*([A-Z0-9]+)/,
            /ASGN TYPE:\s*[UX]\s+ASSIGN:\s*([A-Z0-9]+)(?:\*+)?/,
            
            // Secondary patterns
            /\b([TL]\d{2}[A-Z]{2})\b/,
            /\bBU(\d{2})\b/,
            /\bUL(\d{2})\b/,
            /\bLP\b/,
            /\bS(\d{2})\b/,
            /\bBS(\d{2})\b/,
            /\bPU(\d{2})\b/
        ];

        for (const pattern of patterns) {
            const match = content.match(pattern);
            if (match) {
                return match[1] || match[0];
            }
        }
        return null;
    }

    static extractBulletinNumber(content) {
        const match = content.match(/\b(\d{6})\b/);
        return match ? match[1] : null;
    }

    static determineShift(showUpTime, isCentralTime = false) {
        if (showUpTime === "N/A") return "Unknown";

        try {
            if (showUpTime.includes(',')) return "Mixed Shifts";

            // Parse time
            const [time, period] = showUpTime.split(/(?=[AP]M)/);
            let [hours, minutes] = time.split(':').map(Number);
            
            // Convert to 24-hour format
            if (period === 'PM' && hours < 12) hours += 12;
            if (period === 'AM' && hours === 12) hours = 0;
            
            // Adjust for Central Time if needed
            if (isCentralTime) hours = (hours + 1) % 24;

            // Determine shift
            if (hours >= 5 && hours < 14) return "1st Shift";
            if (hours >= 14 && hours < 22) return "2nd Shift";
            return "3rd Shift";
        } catch (e) {
            console.error('Error determining shift:', e);
            return "Unknown";
        }
    }

    static extractPoolJobName(content) {
        try {
            const match = content.match(/SHORT DESCRIPTION:\s*\(\s*([^)]+)\)/);
            return match ? match[1].trim() : "N/A";
        } catch (e) {
            console.error('Error extracting pool job name:', e);
            return "N/A";
        }
    }

    static parseFullBulletin(content) {
        const isCentralTime = content.includes("DIST: IL SUB-DIST: SL") || 
                            content.toUpperCase().includes("CENTRAL TIME");
        
        const jobId = this.extractJobId(content);
        const showUpTime = this.extractShowUpTime(content);
        const isPoolJob = content.includes("ASGN TYPE: U") || content.includes("ASGN TYPE: X");
        
        const data = {
            jobId: jobId,
            bulletinNumber: this.extractBulletinNumber(content),
            showUpTime: showUpTime,
            restDays: this.extractRestDays(content),
            shift: isPoolJob ? "Pool Job" : this.determineShift(showUpTime, isCentralTime)
        };

        if (isPoolJob) {
            data.jobName = this.extractPoolJobName(content);
        }

        return data;
    }
}

// Make available globally
window.BulletinParser = BulletinParser;