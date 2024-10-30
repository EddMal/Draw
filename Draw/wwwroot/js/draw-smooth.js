import Stroke from './strokes.js'; // Adjust the path as needed

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed");

    const canvasObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.addedNodes.length) {
                for (const node of mutation.addedNodes) {
                    if (node.id === 'drawingCanvas') {
                        initCanvas(node);
                        canvasObserver.disconnect(); // Stop observing once found
                    }
                }
            }
        }
    });

    // Start observing the body for added nodes
    canvasObserver.observe(document.body, { childList: true, subtree: true });

    function initCanvas(canvas) {
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('Failed to get canvas context');
            return;
        }

        const displayWidth = 500;
        const displayHeight = 500;
        canvas.style.width = `${displayWidth}px`;
        canvas.style.height = `${displayHeight}px`;

        let isDrawing = false;
        let lastX = 0;
        let lastY = 0;
        const recentPoints = [];
        const strokes = [];
        const history = [];
        let historyIndex = -1;

        let bgColor = '#ffffff';
        let bgTransparency = 1;

        function saveState() {
            if (historyIndex < history.length - 1) {
                history.splice(historyIndex + 1);
            }
            history.push({ strokes: [...strokes], bgColor, bgTransparency });
            historyIndex++;
            if (history.length > 10) {
                history.shift();
                historyIndex--;
            }
        }

        function redraw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawBackground();
            drawStrokes();
        }

        function drawBackground() {
            ctx.fillStyle = `rgba(${parseInt(bgColor.slice(1, 3), 16)}, ${parseInt(bgColor.slice(3, 5), 16)}, ${parseInt(bgColor.slice(5, 7), 16)}, ${bgTransparency})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        function drawStrokes() {
            strokes.forEach(stroke => stroke.draw(ctx));
        }

        function getCoordinates(e) {
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX || e.touches[0].clientX) - rect.left;
            const y = (e.clientY || e.touches[0].clientY) - rect.top;
            return [x * (canvas.width / displayWidth), y * (canvas.height / displayHeight)];
        }

        function startDrawing(e) {
            isDrawing = true;
            [lastX, lastY] = getCoordinates(e);
        }

        function draw(e) {
            if (!isDrawing) return;

            const [x, y] = getCoordinates(e);
            recentPoints.push({ x, y });

            if (recentPoints.length > 5) {
                recentPoints.shift();
            }

            const avgX = recentPoints.reduce((sum, point) => sum + point.x, 0) / recentPoints.length;
            const avgY = recentPoints.reduce((sum, point) => sum + point.y, 0) / recentPoints.length;

            const strokeColor = `rgba(${parseInt(document.getElementById('colorPicker').value.slice(1, 3), 16)}, ${parseInt(document.getElementById('colorPicker').value.slice(3, 5), 16)}, ${parseInt(document.getElementById('colorPicker').value.slice(5, 7), 16)}, ${document.getElementById('strokeTransparency').value / 100})`;
            const strokeWidth = parseInt(document.getElementById('brushSize').value, 10);

            const stroke = new Stroke(lastX, lastY, avgX, avgY, strokeColor, strokeWidth);
            strokes.push(stroke);

            // Draw the stroke
            stroke.draw(ctx);

            [lastX, lastY] = [avgX, avgY];
        }

        function stopDrawing() {
            if (isDrawing) {
                saveState();
                isDrawing = false;
                ctx.closePath();
                recentPoints.length = 0;
            }
        }

        // Attach mouse and touch events
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseout', stopDrawing);
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            startDrawing(e);
        });
        canvas.addEventListener('touchmove', draw);
        canvas.addEventListener('touchend', stopDrawing);
        canvas.addEventListener('touchcancel', stopDrawing);

        // Clear button
        document.getElementById('clearButton').addEventListener('click', () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            history.length = 0;
            historyIndex = -1;
            strokes.length = 0; // Clear stored strokes
            drawBackground(); // Reset background
        });

        // Save button
        document.getElementById('saveButton').addEventListener('click', () => {
            const link = document.createElement('a');
            link.download = 'drawing.png';
            link.href = canvas.toDataURL();
            link.click();
        });

        // File input for image upload
        document.getElementById('fileInput').addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.onload = () => {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        strokes.length = 0; // Clear stored strokes
                        drawBackground(); // Redraw background after clearing
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    };
                    img.src = e.target.result;
                };
                reader.readAsDataURL(file);
            } else {
                console.error('Please upload a valid image file.');
            }
        });

        // Undo button
        document.getElementById('undoButton').addEventListener('click', () => {
            if (historyIndex > 0) {
                historyIndex--;
                const state = history[historyIndex];
                strokes.length = 0; // Clear current strokes
                strokes.push(...state.strokes); // Restore strokes
                bgColor = state.bgColor; // Restore background color
                bgTransparency = state.bgTransparency; // Restore transparency
                redraw(); // Redraw with restored state
            }
        });

        // Redo button
        document.getElementById('redoButton').addEventListener('click', () => {
            if (historyIndex < history.length - 1) {
                historyIndex++;
                const state = history[historyIndex];
                strokes.length = 0; // Clear current strokes
                strokes.push(...state.strokes); // Restore strokes
                bgColor = state.bgColor; // Restore background color
                bgTransparency = state.bgTransparency; // Restore transparency
                redraw(); // Redraw with restored state
            }
        });

        // Set initial background color and transparency
        function setBackgroundColor() {
            bgColor = document.getElementById('bgColor').value;
            bgTransparency = document.getElementById('bgTransparency').value / 100;
            redraw(); // Redraw background and strokes
        }

        // Function to set the initial background color
        setBackgroundColor();

        // Background color change event
        document.getElementById('bgColor').addEventListener('input', setBackgroundColor);
        document.getElementById('bgTransparency').addEventListener('input', setBackgroundColor);
    }
});
