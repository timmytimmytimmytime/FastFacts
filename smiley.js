// Firefox extension to add smiley to Claude responses
(function () {
  "use strict";

  // Function to add smiley to Claude responses
  function addSmileyToClaudeResponses() {
    // Look for Claude's response containers
    // These selectors target common patterns in Claude.ai's DOM structure
    const responseSelectors = [
      '[data-testid="message-content"]',
      ".prose",
      '[role="presentation"] p',
      ".whitespace-pre-wrap",
    ];

    responseSelectors.forEach((selector) => {
      const responses = document.querySelectorAll(selector);

      responses.forEach((response) => {
        // Skip if we already added a smiley
        if (response.hasAttribute("data-smiley-added")) {
          return;
        }

        // Check if this looks like a Claude response (not user message)
        const parent = response.closest("[data-testid]");
        if (
          parent &&
          !parent.textContent.trim().startsWith("Human:") &&
          !parent.closest('[data-testid="user-message"]')
        ) {
          // Create smiley element
          const smiley = document.createElement("span");
          smiley.textContent = "😊 ";
          smiley.style.fontSize = "16px";
          smiley.style.marginRight = "4px";
          smiley.style.color = "#2563eb";

          // Add smiley to the beginning
          response.insertBefore(smiley, response.firstChild);

          // Mark as processed
          response.setAttribute("data-smiley-added", "true");
        }
      });
    });
  }

  // Run immediately
  addSmileyToClaudeResponses();

  // Watch for new messages (when Claude responds)
  const observer = new MutationObserver((mutations) => {
    let shouldCheck = false;

    mutations.forEach((mutation) => {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        // Check if new nodes contain response content
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const hasResponseContent =
              node.querySelector('[data-testid="message-content"]') ||
              node.querySelector(".prose") ||
              node.matches('[data-testid="message-content"]') ||
              node.matches(".prose");
            if (hasResponseContent) {
              shouldCheck = true;
            }
          }
        });
      }
    });

    if (shouldCheck) {
      // Small delay to ensure content is fully rendered
      setTimeout(addSmileyToClaudeResponses, 100);
    }
  });

  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Also run periodically as backup (in case we miss something)
  setInterval(addSmileyToClaudeResponses, 2000);

  console.log("Claude Smiley Marker extension loaded!");
})();
