// src/ui/styles.ts - UI Styles

export const styles = `
.loading-overlay {
  position: fixed;
  inset: 0;
  background: rgba(26, 26, 46, 0.95);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffd700;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  margin-top: 20px;
  color: #ffd700;
  font-size: 18px;
  font-weight: bold;
}
`;
