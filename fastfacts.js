// Observe and periodically number sentences in Claude responses
function runNumberedSentencesInjection() {
  const responseSelectors = [
    ".standard-markdown > p.whitespace-normal.break-words",
    ".standard-markdown > ol > li.whitespace-normal.break-words",
  ];

  // Helper: recursively count sentences in a node
  function countSentencesInNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return splitIntoSentences(node.textContent).length;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      let count = 0;
      node.childNodes.forEach((child) => {
        count += countSentencesInNode(child);
      });
      return count;
    }
    return 0;
  }

  // Helper: recursively process nodes and number sentences
  function processNode(node, sentenceIdx) {
    if (node.nodeType === Node.TEXT_NODE) {
      const sentences = splitIntoSentences(node.textContent);
      const fragments = [];
      sentences.forEach((sentence, idx) => {
        const span = document.createElement("span");
        span.textContent = `${sentenceIdx.value + 1}. ${sentence} `;
        span.style.fontWeight = "bold";
        span.style.color = "#2563eb";
        fragments.push(span);
        sentenceIdx.value++;
      });
      return fragments;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const clone = node.cloneNode(false);
      node.childNodes.forEach((child) => {
        const processed = processNode(child, sentenceIdx);
        if (Array.isArray(processed)) {
          processed.forEach((frag) => clone.appendChild(frag));
        } else if (processed) {
          clone.appendChild(processed);
        }
      });
      return clone;
    }
    return null;
  }

  // Two-pass: first count, then process
  function twoPassNumbering() {
    // Gather all responses in DOM order
    let allResponses = [];
    responseSelectors.forEach((selector) => {
      document
        .querySelectorAll(selector)
        .forEach((el) => allResponses.push(el));
    });
    // Sort by DOM order (NodeList is already in order)

    // First pass: count sentences in each response
    let sentenceCounts = allResponses.map((response) =>
      countSentencesInNode(response)
    );
    // Compute starting index for each response
    let startIndexes = [];
    let runningTotal = 0;
    for (let i = 0; i < sentenceCounts.length; i++) {
      startIndexes[i] = runningTotal;
      runningTotal += sentenceCounts[i];
    }

    // Second pass: process last 30 first, then rest in batches of 10, working backwards
    const batchSize = 10;
    const initialBatch = 30;
    const total = allResponses.length;

    // Helper to process a batch
    function processBatch(start, end) {
      for (let i = start; i < end; i++) {
        const response = allResponses[i];
        if (response.dataset.fastfactsNumbered === "1") continue;
        // Number sentences in this response
        let sentenceIdx = { value: startIndexes[i] };
        const newChildren = [];
        response.childNodes.forEach((child) => {
          const processed = processNode(child, sentenceIdx);
          if (Array.isArray(processed)) {
            processed.forEach((frag) => newChildren.push(frag));
          } else if (processed) {
            newChildren.push(processed);
          }
        });
        response.innerHTML = "";
        newChildren.forEach((n) => response.appendChild(n));
        response.dataset.fastfactsNumbered = "1";
      }
    }

    // Process last 30 first (bottom 3 pages)
    let firstToProcess = Math.max(0, total - initialBatch);
    processBatch(firstToProcess, total);

    // Then process the rest in batches of 10, working backwards
    function processOlderBatches(batchEnd) {
      if (batchEnd <= 0) return;
      let batchStart = Math.max(0, batchEnd - batchSize);
      processBatch(batchStart, batchEnd);
      setTimeout(() => processOlderBatches(batchStart), 100); // 100ms delay between batches
    }
    processOlderBatches(firstToProcess);
  }

  // Run two-pass numbering on load
  twoPassNumbering();

  // MutationObserver: only process added nodes that match selectors
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            responseSelectors.forEach((selector) => {
              // If the node itself matches
              if (node.matches && node.matches(selector)) {
                // For new nodes, re-run two-pass (could optimize to just number new, but for correctness rerun)
                twoPassNumbering();
              }
              // Or any descendants match
              if (node.querySelectorAll) {
                node
                  .querySelectorAll(selector)
                  .forEach(() => twoPassNumbering());
              }
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
  // Rare backup: rerun every 30 seconds
  setInterval(twoPassNumbering, 30000);
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

function runSmileyInjection() {
  function addSmileyToClaudeResponses() {
    const responseSelectors = [
      ".standard-markdown > p.whitespace-normal.break-words",
      ".standard-markdown > ol > li.whitespace-normal.break-words",
    ];
    responseSelectors.forEach((selector) => {
      const responses = document.querySelectorAll(selector);
      if (responses.length > 0) {
        console.log(
          `[FastFacts] Selector '${selector}' matched ${responses.length} elements`
        );
      }
      responses.forEach((response) => {
        // Remove ALL leading smileys (in case of multiple or DOM reuse)
        while (
          response.firstChild &&
          response.firstChild.nodeType === Node.ELEMENT_NODE &&
          response.firstChild.textContent &&
          response.firstChild.textContent.startsWith("😊 ")
        ) {
          response.removeChild(response.firstChild);
        }
        // Add smiley only (no neon)
        const smiley = document.createElement("span");
        smiley.textContent = "😊 ";
        smiley.style.fontSize = "20px";
        smiley.style.marginRight = "8px";
        smiley.style.color = "#2563eb";
        smiley.title = "Injected by FastFacts Extension";
        response.insertBefore(smiley, response.firstChild);
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
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // If any new element is added, re-run smiley injection
            shouldCheck = true;
          }
        });
      }
    });
    if (shouldCheck) {
      setTimeout(addSmileyToClaudeResponses, 100);
    }
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Also run periodically as backup (in case we miss something)
  setInterval(addSmileyToClaudeResponses, 2000);
}

(function () {
  "use strict";
  // runSmileyInjection();
  runNumberedSentencesInjection();
  console.log(`Claude ${strings.appName} extension loaded!`);
})();
