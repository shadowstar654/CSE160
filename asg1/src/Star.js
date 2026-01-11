class Star {
    constructor() {
        this.color = [1.0, 1.0, 0.0, 1.0]; // yellow
        this.vertices = [];               // filled externally
    }

    render() {
        if (this.vertices.length === 0) return;

        for (let i = 0; i < this.vertices.length; i += 6) {
            drawTriangle(
                this.vertices.slice(i, i + 6),
                this.color
            );
        }
    }
}
