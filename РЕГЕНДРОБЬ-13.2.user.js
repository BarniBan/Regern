// ==UserScript==
// @name         РЕГЕНДРОБЬ
// @namespace    http://tampermonkey.net/
// @version      13.2
// @description  Energy Calculator + WebSocket Logger (Resizable & Draggable working properly + parser)
// @author       YourName
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    // ========= DRAGGABLE + RESIZABLE =========
    function makeResizable(el) {
        el.style.position = 'fixed';
        el.style.resize = 'both'; // <- ключевой стиль для увеличения/уменьшения
        el.style.overflow = 'auto';
        el.style.minWidth = '200px';
        el.style.minHeight = '100px';
        el.style.boxSizing = 'border-box';
    }

    // ========== WebSocket Logger ==========
    function initWebSocketLogger() {
        function formatTime(date) {
            const pad = (n, z = 2) => ('00' + n).slice(-z);
            return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
        }

        const createLogWindow = () => {
            const panel = document.createElement('div');
            panel.id = 'ws-log-panel';
            Object.assign(panel.style, {
                bottom: '10px',
                right: '10px',
                width: '450px',
                height: '250px',
                zIndex: 999998,
                background: 'rgba(0, 0, 0, 0.9)',
                color: '#00FFCC',
                fontSize: '12px',
                fontFamily: 'monospace',
                border: '1px solid #00FFCC',
                padding: '5px',
                borderRadius: '6px',
                boxShadow: '0 0 8px #00FFCC',
                userSelect: 'text',
                position: 'fixed',
                overflow: 'auto',
                resize: 'both',
            });

            panel.innerHTML = `
                <div style="text-align:right; margin-bottom:4px;">
                    <button id="clear-ws-log" style="background:none;border:1px solid #00FFCC;color:#00FFCC;font-size:10px;padding:2px 6px;cursor:pointer;border-radius:3px;">Clear</button>
                    <button id="copy-ws-log" style="background:none;border:1px solid #00FFCC;color:#00FFCC;font-size:10px;padding:2px 6px;cursor:pointer;border-radius:3px;margin-left:4px;">Copy All</button>
                </div>
                <div id="ws-log-content" style="max-height: calc(100% - 30px); overflow-y: auto;"></div>
            `;
            document.body.appendChild(panel);

            document.getElementById('clear-ws-log').onclick = () => {
                document.getElementById('ws-log-content').innerHTML = '';
            };

            document.getElementById('copy-ws-log').onclick = () => {
                const content = document.getElementById('ws-log-content').textContent;
                navigator.clipboard.writeText(content).then(() => {
                    const btn = document.getElementById('copy-ws-log');
                    btn.textContent = 'Copied!';
                    setTimeout(() => btn.textContent = 'Copy All', 2000);
                });
            };
        };

        const OriginalWebSocket = window.WebSocket;
        window.WebSocket = function (...args) {
            const socket = new OriginalWebSocket(...args);
            socket.addEventListener('message', function (event) {
                const raw = event.data;
                const logContainer = document.getElementById('ws-log-content');
                const timestamp = formatTime(new Date());

                if (logContainer) {
                    const line = document.createElement('div');
                    line.textContent = `[${timestamp}] ${raw}`;
                    line.style.marginBottom = '2px';
                    line.style.whiteSpace = 'pre-wrap';
                    logContainer.appendChild(line);
                    logContainer.scrollTop = logContainer.scrollHeight;
                }

                console.log(`%c[${timestamp}] WS:`, 'color: cyan; font-weight: bold;', raw);
            });
            return socket;
        };
        window.WebSocket.prototype = OriginalWebSocket.prototype;
        window.addEventListener('DOMContentLoaded', createLogWindow);
    }

    // ========== Energy Calculator ==========
    function initEnergyCalculator() {
        const container = document.createElement('div');
        Object.assign(container.style, {
            top: '20px',
            right: '20px',
            width: '400px',
            height: '360px',
            background: 'white',
            padding: '15px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            zIndex: 999999,
            fontFamily: 'Arial, sans-serif',
            userSelect: 'text'
        });

        container.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h3 style="margin:0; color:#333;">Energy Calculator</h3>
                <button id="copy-results" style="background:#4CAF50; color:white; border:none; border-radius:4px; cursor:pointer; padding:4px 8px; font-size:12px;">Copy Results</button>
            </div>
            <textarea id="energy-input" rows="8" style="width:100%; height:100px; padding:8px; border:1px solid #ccc; border-radius:4px; margin-bottom:10px; font-family:monospace;"></textarea>
            <button id="calculate-btn" style="width:100%; padding:10px; background:#4CAF50; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:bold;">
                Calculate
            </button>
            <div id="energy-result" style="margin-top:15px; max-height:150px; overflow-y:auto; color: black;"></div>
        `;
        document.body.appendChild(container);
        makeResizable(container); // Только изменение размера, без перетаскивания

        function extractEnergies(text) {
            const regex = /"energy"\s*:\s*([\d.]+)/g;
            const matches = [...text.matchAll(regex)];
            if (matches.length) {
                return matches.map(m => parseFloat(m[1])).filter(n => !isNaN(n));
            }
            // Если energy не найден, пробуем просто парсить строки
            return text.split('\n')
                .map(line => parseFloat(line.trim()))
                .filter(n => !isNaN(n));
        }

        function calculateByYourMethod(sequence) {
            const cleanSeq = sequence.filter(val => val > 0);
            const steps = cleanSeq.length;
            if (steps === 0) return null;

            const baseK = cleanSeq[steps - 1] / steps;
            let problemStep = null;

            for (let i = 0; i < steps; i++) {
                const step = i + 1;
                const expected = cleanSeq[i];
                const rounded = Math.round(step * baseK * 100) / 100;
                if (Math.abs(rounded - expected) > 0.001) {
                    problemStep = { step, expected };
                    break;
                }
            }

            return problemStep
                ? (baseK + (problemStep.expected / problemStep.step)) / 2
                : baseK;
        }

        document.getElementById('calculate-btn').addEventListener('click', function () {
            const input = document.getElementById('energy-input').value.trim();
            const resultDiv = document.getElementById('energy-result');
            const sequence = extractEnergies(input);

            if (sequence.length === 0) {
                resultDiv.innerHTML = '<div style="color:red;">Enter energy values or logs</div>';
                return;
            }

            const k = calculateByYourMethod(sequence);
            const steps = sequence.length;

            let resultHTML = `
                <div style="background:#f8f8f8; padding:10px; border-radius:6px; color: black;">
                    <p><strong>Optimal coefficient:</strong> <code style="background:#eee; padding:2px 6px; border-radius:4px;">${k.toFixed(8)}</code></p>
                    <table style="width:100%; font-size:12px; border-collapse:collapse; color: black;">
                        <thead>
                            <tr style="background:#eaeaea;">
                                <th style="padding:4px;">Step</th>
                                <th style="padding:4px;">Calc</th>
                                <th style="padding:4px;">Rounded</th>
                                <th style="padding:4px;">Expected</th>
                                <th style="padding:4px;">✓</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            for (let i = 0; i < steps; i++) {
                const step = i + 1;
                const expected = sequence[i];
                const calculated = step * k;
                const rounded = Math.round(calculated * 100) / 100;
                const match = Math.abs(rounded - expected) < 0.001 ? '✓' : '✗';

                resultHTML += `
                    <tr style="${i % 2 === 0 ? 'background:#fafafa;' : ''}">
                        <td style="padding:4px; text-align:center;">${step}</td>
                        <td style="padding:4px; text-align:right;">${calculated.toFixed(5)}</td>
                        <td style="padding:4px; text-align:right;">${rounded.toFixed(2)}</td>
                        <td style="padding:4px; text-align:right;">${expected.toFixed(2)}</td>
                        <td style="padding:4px; text-align:center; color:${match === '✓' ? 'green' : 'red'};">${match}</td>
                    </tr>
                `;
            }

            resultHTML += `</tbody></table></div>`;
            resultDiv.innerHTML = resultHTML;
        });

        // Добавляем кнопку копирования результатов
        document.getElementById('copy-results').addEventListener('click', function() {
            const resultDiv = document.getElementById('energy-result');
            if (resultDiv) {
                const textToCopy = resultDiv.textContent;
                navigator.clipboard.writeText(textToCopy).then(() => {
                    const btn = document.getElementById('copy-results');
                    btn.textContent = 'Copied!';
                    setTimeout(() => btn.textContent = 'Copy Results', 2000);
                });
            }
        });
    }

    // Инициализация
    initWebSocketLogger();
    window.addEventListener('DOMContentLoaded', initEnergyCalculator);
})();
