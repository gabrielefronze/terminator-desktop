/** Accumulates terminal keystrokes until Enter and emits completed command lines. */
export class TerminalCommandBuffer {
    private buffer = "";
    private escape = false;

    feed(data: string, onLine: (line: string) => void): void {
        for (let i = 0; i < data.length; i++) {
            const char = data[i];

            if (this.escape) {
                if (/[a-zA-Z~]/.test(char)) {
                    this.escape = false;
                    this.buffer = "";
                }
                continue;
            }

            if (char === "\x1b") {
                this.escape = true;
                continue;
            }

            if (char === "\r" || char === "\n") {
                const line = this.buffer.trim();
                this.buffer = "";
                if (line.length >= 2) {
                    onLine(line);
                }
                continue;
            }

            if (char === "\x7f" || char === "\b") {
                this.buffer = this.buffer.slice(0, -1);
                continue;
            }

            if (char === "\x03" || char === "\x04" || char === "\x15") {
                this.buffer = "";
                continue;
            }

            if (char < " " && char !== "\t") {
                continue;
            }

            this.buffer += char;
            if (this.buffer.length > 8192) {
                this.buffer = this.buffer.slice(-4096);
            }
        }
    }

    reset(): void {
        this.buffer = "";
        this.escape = false;
    }
}
