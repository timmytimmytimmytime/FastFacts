// Observe and periodically number sentences in Claude responses
function runNumberedSentencesInjection() {
  // Only process .standard-markdown blocks that are NOT inside a user message
  function isClaudeResponseBlock(block) {
    return (
      block.classList.contains("standard-markdown") &&
      !block.closest('[data-testid="user-message"]')
    );
  }

  // Helper: recursively process nodes and number sentences locally
  // Helper: check if element is visible
  function isVisible(el) {
    return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  }

  // Helper: process a <p> or <li> and prepend number span if visible
  function processElementWithNumber(el, sentenceIdx, isLi) {
    if (!isVisible(el) || el.dataset.fastfactsProcessed === "1") return;
    // Remove any previous diamond or number span
    while (
      el.firstChild &&
      el.firstChild.classList &&
      (el.firstChild.classList.contains("fastfacts-diamond") ||
        el.firstChild.classList.contains("fastfacts-number"))
    ) {
      el.removeChild(el.firstChild);
    }
    // Add flex class for <li> and <p>
    if (isLi) {
      el.classList.add("fastfacts-li-numbered");
    } else {
      el.classList.add("fastfacts-p-numbered");
    }
    // Insert diamond icon for both <p> and <li>
    const diamond = document.createElement("span");
    diamond.className = "fastfacts-diamond";
    diamond.textContent = "🔹 ";
    diamond.style.color = "#2563eb";
    diamond.style.fontSize = "1em";
    diamond.style.marginRight = "2px";
    el.insertBefore(diamond, el.firstChild);
    el.dataset.fastfactsProcessed = "1";
  }

  // Process and mark a single Claude response block
  function processClaudeResponseBlock(block) {
    if (block.dataset.fastfactsProcessed === "1") return;
    // Only process <p.whitespace-normal.break-words> and <li.whitespace-normal.break-words> direct children (ol or ul)
    const pSelector = ":scope > p.whitespace-normal.break-words";
    const liSelector =
      ":scope > ol > li.whitespace-normal.break-words, :scope > ul > li.whitespace-normal.break-words";
    let sentenceIdx = { value: 0 };
    // Process <p>
    block.querySelectorAll(pSelector).forEach((el) => {
      processElementWithNumber(el, sentenceIdx, false);
    });
    // Process <li> in both ol and ul
    block.querySelectorAll(liSelector).forEach((el) => {
      processElementWithNumber(el, sentenceIdx, true);
    });
    block.dataset.fastfactsProcessed = "1";
  }

  // Initial scan: process only the last 10 Claude responses
  function initialScan() {
    const allBlocks = Array.from(
      document.querySelectorAll(".standard-markdown")
    );
    const claudeBlocks = allBlocks.filter(isClaudeResponseBlock);
    const last10 = claudeBlocks.slice(-10);
    last10.forEach(processClaudeResponseBlock);
  }

  // MutationObserver: process new Claude responses only
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // If the node itself is a Claude response block
            if (isClaudeResponseBlock(node)) {
              processClaudeResponseBlock(node);
            }
            // Or any descendants are Claude response blocks
            node.querySelectorAll &&
              node.querySelectorAll(".standard-markdown").forEach((block) => {
                if (isClaudeResponseBlock(block))
                  processClaudeResponseBlock(block);
              });
          }
        });
      }
    });
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
  initialScan();
}

// Number each sentence in Claude responses
// numberClaudeSentences is now inlined in runNumberedSentencesInjection for performance
// Utility: Split text into sentences, handling edge cases
function splitIntoSentences(text) {
  if (!text || typeof text !== "string") return [];
  // Regex: split on . ! ? followed by space or end, but not for common abbreviations/URLs
  // This is a simple but robust approach for most English text
  const sentenceEnd =
    /(?<!\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs|etc|e\.g|i\.e|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec|U\.S|U\.K|No|pp|vol|al|ca|cf|Co|Inc|Ltd|Mt|Rd|Ave|Bros|Corp|Dept|Univ|Fig|Eq|Ref|Refs|Ch|Ed|eds|p|n|Op|op|Art|art|Sec|sec|Pt|pt|Nos|nos|esp|esp\.|[A-Z])\.|https?:\/\/[^\s]+)\.|[!?](?=\s|$)/g;
  let raw = text.split(sentenceEnd);
  // Clean and filter
  let sentences = raw
    .map((s) => s.trim())
    .filter((s) => s.length >= 10 && s.length <= 200 && /[a-zA-Z0-9]/.test(s));
  return sentences;
}

const strings = {
  appName: "Fast Facts",
  debugMode: "Debug Mode",
  confidenceHigh: "High Confidence",
  confidenceLow: "Low Confidence",
  riskHigh: "High Risk",
  riskLow: "Low Risk",
};

(function () {
  "use strict";
  runNumberedSentencesInjection();
  console.log(`Claude ${strings.appName} extension loaded!`);
})();
