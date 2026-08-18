import React from 'react';

/**
 * MoneyInput Component
 * Blocks all non-numeric characters (only allows 0-9)
 * Prevents decimal entry for Paisa-only architecture
 */
function MoneyInput({ 
  value, 
  onChange, 
  placeholder = "0", 
  disabled = false,
  required = false,
  id,
  label,
  min = 0
}) {
  const handleKeyDown = (e) => {
    // Allow: backspace, delete, tab, escape, enter
    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'];
    
    if (allowedKeys.includes(e.key)) {
      return;
    }
    
    // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
    if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) {
      return;
    }
    
    // Block: decimal point, minus, plus, and any non-digit
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    
    // Extract only digits from pasted content
    const digitsOnly = pastedText.replace(/\D/g, '');
    
    if (digitsOnly) {
      // Trigger onChange with cleaned value
      const event = { target: { value: digitsOnly } };
      onChange(event);
    }
  };

  const handleChange = (e) => {
    // Extra safety: strip any non-digit characters
    const cleaned = e.target.value.replace(/\D/g, '');
    
    // Update with cleaned value
    const event = { target: { value: cleaned } };
    onChange(event);
  };

  return (
    <div className="form-group">
      {label && <label htmlFor={id}>{label}</label>}
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        id={id}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        min={min}
      />
    </div>
  );
}

export default MoneyInput;
