
// Tab switching functionality
const tabs = document.querySelectorAll('[role="tab"]');
const panels = document.querySelectorAll('[role="tabpanel"]');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const targetPanel = tab.getAttribute('aria-controls');

    // Remove active state from all tabs
    tabs.forEach(t => {
      t.setAttribute('aria-selected', 'false');
      t.setAttribute('tabindex', '-1');
    });

    // Hide all panels
    panels.forEach(p => {
      p.setAttribute('aria-hidden', 'true');
    });

    // Set clicked tab as active
    tab.setAttribute('aria-selected', 'true');
    tab.setAttribute('tabindex', '0');

    // Show corresponding panel
    document.getElementById(targetPanel).setAttribute('aria-hidden', 'false');
  });

  // Keyboard navigation
  tab.addEventListener('keydown', (e) => {
    let index = Array.from(tabs).indexOf(tab);
    let newIndex = index;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      newIndex = (index + 1) % tabs.length;
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      newIndex = (index - 1 + tabs.length) % tabs.length;
      e.preventDefault();
    } else if (e.key === 'Home') {
      newIndex = 0;
      e.preventDefault();
    } else if (e.key === 'End') {
      newIndex = tabs.length - 1;
      e.preventDefault();
    }

    tabs[newIndex].focus();
    tabs[newIndex].click();
  });
});   
